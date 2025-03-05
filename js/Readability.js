/*
 * Copyright (c) 2010 Arc90 Inc
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
 * This code is a simplified version of Mozilla's Readability.js
 * The original source code is available at:
 * https://github.com/mozilla/readability
 */

(function(global) {
  'use strict';

  // All the implementations will be attached to Readability.
  function Readability(doc, options) {
    // Setup options
    options = options || {};

    this._doc = doc;
    this._documentElement = doc.documentElement;
    this._articleTitle = null;
    this._articleByline = null;
    this._articleDir = null;
    this._attempts = [];

    // Configurable options
    this._debug = !!options.debug;
    this._maxElemsToParse = options.maxElemsToParse || 0;
    this._nbTopCandidates = options.nbTopCandidates || 5;
    this._charThreshold = options.charThreshold || 500;
    this._classesToPreserve = options.classesToPreserve || [];
    this._keepClasses = !!options.keepClasses;
    this._flags = this._flags || {};
    this._flags.stripUnlikelyCandidates = options.stripUnlikelyCandidates !== false;
    this._flags.weightClasses = options.weightClasses !== false;
    this._flags.cleanConditionally = options.cleanConditionally !== false;
  }

  Readability.prototype = {
    /**
     * Run the Readability algorithm on the document and return the object.
     * @return {Object} A JavaScript object containing the article content and title.
     */
    parse: function() {
      // Unwrap image from noscript
      this._unwrapNoscriptImages(this._doc);
      
      var isProbablyReaderable = this._isProbablyReaderable();
      
      // If the document is not probably readable, abort
      if (!isProbablyReaderable) {
        if (this._debug) console.log("Document not probably readable, aborting.");
        return {
          title: this._getArticleTitle(),
          content: '',
          textContent: '',
          length: 0,
          byline: '',
          dir: ''
        };
      }

      // Clone the document so we can make changes without affecting the original
      var docClone = this._doc.cloneNode(true);
      
      // Remove scripts
      this._removeScripts(docClone);
      
      // Prepare the document
      this._prepDocument(docClone);
      
      // Get article content
      var articleContent = this._grabArticle(docClone);
      
      if (!articleContent) {
        return {
          title: this._getArticleTitle(),
          content: '',
          textContent: '',
          length: 0,
          byline: '',
          dir: ''
        };
      }

      // Get the article title
      this._articleTitle = this._getArticleTitle(docClone);
      
      // Get the article byline
      this._articleByline = this._getArticleByline(articleContent);
      
      // Get the article direction
      this._articleDir = this._getArticleDir(docClone);
      
      // Clean up the article content
      articleContent = this._postProcessContent(articleContent);
      
      // Clean article element with title and content
      return {
        title: this._articleTitle,
        content: articleContent.innerHTML,
        textContent: articleContent.textContent,
        length: articleContent.textContent.length,
        byline: this._articleByline,
        dir: this._articleDir
      };
    },

    /**
     * Get the article title as an H1.
     * @return {string} Article title
     */
    _getArticleTitle: function() {
      var doc = this._doc;
      var title = '';
      
      // Look for the article title
      var titleElement = doc.querySelector('title');
      if (titleElement) {
        title = titleElement.textContent.trim();
      }
      
      // If there's no title, use the document location
      if (!title) {
        try {
          title = doc.location.href.replace(/\/$/, '');
          title = title.replace(/^https?:\/\/(www\.)?/, '');
          title = title.replace(/\.(html|php|aspx?)$/, '');
          title = title.replace(/[_\-\/]/g, ' ');
          title = title.split(/[\/?&]/).shift();
          title = title.charAt(0).toUpperCase() + title.substr(1);
        } catch (e) {
          // Failed to get the title from the URL
        }
      }
      
      return title;
    },

    /**
     * Checks if a document appears to have readable content.
     * @return {boolean} Whether or not we suspect the document is readable.
     */
    _isProbablyReaderable: function() {
      var nodes = this._doc.querySelectorAll('p, pre, article, div.article, div.content');
      
      // If we have very few nodes, consider it not readable
      if (nodes.length < 5) return false;
      
      // Count text nodes over 100 characters
      var textContentLength = 0;
      for (var i = 0; i < nodes.length; i++) {
        var nodeText = nodes[i].textContent.trim();
        if (nodeText.length > 100) {
          textContentLength += nodeText.length;
        }
      }
      
      // If we have a decent amount of text, consider it readable
      return textContentLength > this._charThreshold;
    },

    /**
     * Removes script tags from the document.
     * @param {Document} doc The document to clean.
     */
    _removeScripts: function(doc) {
      var scripts = doc.getElementsByTagName('script');
      for (var i = scripts.length - 1; i >= 0; i--) {
        scripts[i].parentNode.removeChild(scripts[i]);
      }
    },

    /**
     * Prepare the document for extraction by removing elements, etc.
     * @param {Document} doc The document to prepare.
     */
    _prepDocument: function(doc) {
      // Remove comments
      var comments = doc.querySelectorAll('comment');
      for (var i = comments.length - 1; i >= 0; i--) {
        var commentNode = comments[i];
        commentNode.parentNode.removeChild(commentNode);
      }
      
      // Remove unlikely candidates
      if (this._flags.stripUnlikelyCandidates) {
        this._removeUnlikelyCandidates(doc);
      }
    },

    /**
     * Unwrap noscript images to normal images.
     * @param {Document} doc The document to unwrap.
     */
    _unwrapNoscriptImages: function(doc) {
      var noscripts = doc.getElementsByTagName('noscript');
      for (var i = 0; i < noscripts.length; i++) {
        var noscript = noscripts[i];
        var match = noscript.innerHTML.match(/<img[^>]+>/i);
        if (match) {
          var img = match[0];
          noscript.parentNode.innerHTML = img + noscript.parentNode.innerHTML;
        }
      }
    },

    /**
     * Remove unlikely candidates from the document.
     * @param {Document} doc The document to clean.
     */
    _removeUnlikelyCandidates: function(doc) {
      var unlikelyCandidates = /banner|breadcrumbs|combx|comment|community|cover-wrap|disqus|extra|foot|header|legends|menu|modal|related|remark|replies|rss|shoutbox|sidebar|skyscraper|social|sponsor|supplemental|ad-break|agegate|pagination|pager|popup|yom-remote/i;
      var okMaybeItsACandidate = /and|article|body|column|main|shadow/i;
      
      var elementsToScore = doc.querySelectorAll('*');
      for (var i = 0; i < elementsToScore.length; i++) {
        var node = elementsToScore[i];
        var tagName = node.tagName.toLowerCase();
        
        // Remove unlikely candidates
        var classAndId = (node.getAttribute('class') || '') + ' ' + (node.getAttribute('id') || '');
        if (
          (this._flags.stripUnlikelyCandidates) &&
          unlikelyCandidates.test(classAndId) &&
          !okMaybeItsACandidate.test(classAndId) &&
          tagName !== 'body' &&
          tagName !== 'html'
        ) {
          if (this._debug) console.log("Removing unlikely candidate - " + classAndId);
          node.parentNode.removeChild(node);
          i--;
        }
      }
    },

    /**
     * Grab the article content.
     * @param {Document} doc The document to extract from.
     * @return {Element} The article element.
     */
    _grabArticle: function(doc) {
      var isPaging = false;
      var pageLinks = [];
      var page = null;
      
      // First, node prepping. Trash nodes that look cruddy (like ones with the
      // class name "comment", etc), and turn divs into P tags where they have been
      // used inappropriately (as in, where they contain no other block level elements.)
      var nodes = doc.querySelectorAll('p, td, pre');
      
      // Find the main article container element
      var candidates = [];
      var bestscore = 0;
      var bestNode = null;
      
      // Score each paragraph
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        var parentNode = node.parentNode;
        var content = node.textContent.trim();
        
        // Skip short paragraphs
        if (content.length < 25) continue;
        
        // Score the parent node
        if (!parentNode.__score) {
          parentNode.__score = 1;
          candidates.push(parentNode);
        } else {
          parentNode.__score += 1;
        }
        
        // Check if this is the best candidate so far
        if (parentNode.__score > bestscore) {
          bestscore = parentNode.__score;
          bestNode = parentNode;
        }
      }
      
      // If we found a good candidate, use it
      if (bestNode) {
        // Create a new div to hold the article content
        var article = doc.createElement("DIV");
        
        // Append all children of the best candidate to the article
        while (bestNode.firstChild) {
          article.appendChild(bestNode.firstChild);
        }
        
        return article;
      }
      
      // If we didn't find a good candidate, just use the body
      var article = doc.createElement("DIV");
      var children = doc.body.childNodes;
      for (var i = 0; i < children.length; i++) {
        article.appendChild(children[i].cloneNode(true));
      }
      
      return article;
    },

    /**
     * Get the article byline if available.
     * @param {Element} articleContent The article content element.
     * @return {string} Article byline or empty string if none.
     */
    _getArticleByline: function(articleContent) {
      // Look for byline in meta tags
      var byline = '';
      var metas = this._doc.getElementsByTagName('meta');
      for (var i = 0; i < metas.length; i++) {
        var name = metas[i].getAttribute('name');
        if (name && name.toLowerCase().indexOf('byline') !== -1) {
          byline = metas[i].getAttribute('content');
          break;
        }
      }
      
      return byline;
    },

    /**
     * Get the direction of the article.
     * @param {Document} doc The document to extract from.
     * @return {string} Article direction (ltr or rtl).
     */
    _getArticleDir: function(doc) {
      var dir = doc.body.getAttribute('dir') || doc.documentElement.getAttribute('dir') || 'ltr';
      return dir.toLowerCase();
    },

    /**
     * Post-process the article content.
     * @param {Element} articleContent The article content element.
     * @return {Element} The processed article content.
     */
    _postProcessContent: function(articleContent) {
      // Clean out junk from the article content
      this._clean(articleContent, 'form');
      this._clean(articleContent, 'object');
      this._clean(articleContent, 'embed');
      this._clean(articleContent, 'iframe');
      this._clean(articleContent, 'script');
      this._clean(articleContent, 'style');
      
      // Remove empty paragraphs
      this._cleanEmptyNodes(articleContent);
      
      return articleContent;
    },

    /**
     * Remove all elements of a given tag name from the element.
     * @param {Element} element The element to clean.
     * @param {string} tagName The tag name to remove.
     */
    _clean: function(element, tagName) {
      var tags = element.getElementsByTagName(tagName);
      for (var i = tags.length - 1; i >= 0; i--) {
        tags[i].parentNode.removeChild(tags[i]);
      }
    },

    /**
     * Remove empty nodes from the element.
     * @param {Element} element The element to clean.
     */
    _cleanEmptyNodes: function(element) {
      var children = element.children;
      for (var i = children.length - 1; i >= 0; i--) {
        var child = children[i];
        var text = child.textContent.trim();
        if (text.length === 0 && child.children.length === 0) {
          child.parentNode.removeChild(child);
        } else {
          this._cleanEmptyNodes(child);
        }
      }
    }
  };

  // Export the Readability constructor to the global object
  global.Readability = Readability;
}(this)); 