<template>
  <v-card
    v-bind="$attrs"
    class="post-editor"
  >

    <v-card-text class="pr-0 pl-0">
      <div class="post-editor-toolbar">
        <v-btn
          :color="format.header ? 'primary' : 'tertiary'"
          text
          small
          icon
          @click="toggleFormat('header')"
        >
          <v-icon>mdi-format-header-1</v-icon>
        </v-btn>
        <v-btn
          :color="format.bold ? 'primary' : 'tertiary'"
          text
          small
          icon
          @click="toggleFormat('bold')"
        >
          <v-icon>mdi-format-bold</v-icon>
        </v-btn>
        <v-btn
          :color="format.italic ? 'primary' : 'tertiary'"
          text
          small
          icon
          @click="toggleFormat('italic')"
        >
          <v-icon>mdi-format-italic</v-icon>
        </v-btn>
        <v-btn
          :color="format.underline ? 'primary' : 'tertiary'"
          text
          small
          icon
          @click="toggleFormat('underline')"
        >
          <v-icon>mdi-format-underline</v-icon>
        </v-btn>
        <v-btn
          :color="format.strike ? 'primary' : 'tertiary'"
          text
          small
          icon
          @click="toggleFormat('strike')"
        >
          <v-icon>mdi-format-strikethrough</v-icon>
        </v-btn>
        <v-btn
          :color="format.blockquote ? 'primary' : 'tertiary'"
          text
          small
          icon
          @click="toggleFormat('blockquote')"
        >
          <v-icon>mdi-format-quote-open</v-icon>
        </v-btn>
        <v-btn
          :color="format['code-block'] ? 'primary' : 'tertiary'"
          text
          small
          icon
          @click="toggleFormat('code-block')"
        >
          <v-icon>mdi-code-tags</v-icon>
        </v-btn>
        <v-btn
          color="tertiary"
          text
          small
          icon
          @click="toggleFormat('removeFormat')"
        >
          <v-icon>mdi-format-clear</v-icon>
        </v-btn>
        <v-btn
          color="tertiary"
          text
          small
          icon
          @click="uploadImage()"
        >
          <v-icon>mdi-image-plus</v-icon>
        </v-btn>
        <v-btn
          v-if="false"
          color="tertiary"
          text
          small
          @click="test()"
        >
          <span>test</span>
        </v-btn>
      </div>
      <div class="post-editor-content">
        <div
          ref="contentEditable"
          contenteditable="true"
          @paste="onPasteContent"
          @keydown="onKeyDown"
          @keyup="onKeyUp"
          @textInput="onTextInput"
        />
      </div>
    </v-card-text>
  </v-card>
</template>

<style lang="scss">
.post-editor-toolbar {
  border: 1px solid #ccc;
  box-sizing: border-box;
  padding: 8px;
}

.post-editor-content {
  border: 1px solid #ccc;
  box-sizing: border-box;
  font-size: 16px;
  height: 100%;
  margin: 0px;
  position: relative;

  div[contenteditable="true"] {
    box-sizing: border-box;
    line-height: 1.42;
    height: 100%;
    outline: none;
    overflow-y: auto;
    padding: 12px 15px;
    -o-tab-size: 4;
    tab-size: 4;
    -moz-tab-size: 4;
    text-align: left;
    white-space: pre-wrap;
    word-wrap: break-word;

    img,
    iframe,
    video {
      min-width: 0px !important; /* instagram override */
      max-width: min(100%, 512px) !important;
      display: block;
      padding-bottom: 10px;
    }

    blockquote {
      border-left: 4px solid #ccc;
      margin-bottom: 5px;
      margin-top: 5px;
      padding-left: 16px;
    }

    pre {
      white-space: pre-wrap;
      margin-bottom: 5px;
      margin-top: 5px;
      padding: 5px 10px;
      background-color: #23241f;
      color: #f8f8f2;
      overflow: visible;
    }

    .mention {
      color: $hiki-mention-color !important;
      font-weight: bolder;
      text-decoration: none;

      a {
        color: $hiki-mention-color !important;
        text-decoration: none;
      }
    }
  }
}
</style>

<script>
import mixins from "../../mixins";
import { sanitizeHTML, delay } from "../../utility";
import api from "../../server/api";

api;
delay;

function queryTagState(tagName) {
  const selection = document.getSelection();
  const node =
    selection.anchorNode?.closest?.(tagName) ??
    selection.anchorNode?.parentNode?.closest?.(tagName);
  return node;
}

function toggleTag(tagName) {
  const tagNode = queryTagState(tagName);
  if (tagNode) {
    const parentNode = tagNode.parentNode;
    const children = Array.from(tagNode.childNodes);
    for (let i = 0; i < children.length; i++) {
      parentNode.insertBefore(children[i], tagNode);
    }
    parentNode.removeChild(tagNode);
  } else {
    document.execCommand("formatBlock", false, tagName);
  }
}

export default {
  name: "ContentEditor",
  components: {},
  mixins: [mixins.Common],
  props: {
    value: { type: String, default: "" },
  },
  data: function () {
    return {
      format: {},
    };
  },
  computed: {

  },
  watch: {
    value() {
      if (this.value != this.getHTML()) {
        this.$refs.contentEditable.innerHTML = this.value;
      }
    }
  },
  async created() {},
  async mounted() {
    const observer = new MutationObserver(() => {
      this.onContentChange();
    });
    observer.observe(this.$el, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    this._observer = observer;
    this._lastActiveSelection = null;
    this._spaceDetectRequired = true;
    this._needProcessText = false;
    this._atTagSelection = null;

    document.addEventListener("selectionchange", this.onSelectionChange);

    //alert("v5");
  },
  async beforeDestroy() {
    this._observer?.disconnect();
    document.removeEventListener("selectionchange", this.onSelectionChange);
  },
  methods: {
    processMentionTextNode(textNode) {
      const textValue = textNode.nodeValue;
      const searchRegex = this._spaceDetectRequired
        ? /(^|\s)(@|#|\*)[0-9A-Za-z_]{3,}\s/i
        : /(^|\s)(@|#|\*)[0-9A-Za-z_]{3,}/i;
      const match = textValue.match(searchRegex);
      if (!match) return false;

      const space = match[0].match(/^\s/);
      const spaceOffset = space ? space[0].length : 0;

      const spaceEnd = match[0].match(/\s$/);
      const spaceOffsetEnd = spaceEnd ? spaceEnd[0].length : 0;

      const range = document.createRange();
      range.setStart(textNode, match.index + spaceOffset);
      range.setEnd(textNode, match.index + match[0].length - spaceOffsetEnd);

      const mentionText = match[0].trim();
      const mentionHref = window._domFixer.mentionLink(
        mentionText.charAt(0),
        mentionText.substring(1)
      );

      const a = document.createElement("a");
      a.setAttribute("class", "mention");
      a.setAttribute("href", mentionHref);
      a.setAttribute("target", "_blank");
      a.setAttribute("contenteditable", "false");
      a.setAttribute("data-denotation-char", mentionText.charAt(0));

      //console.log(mentionText, mentionHref);

      range.surroundContents(a);

      if (a.nextSibling?.nodeName == "#text" && a.nextSibling.nodeValue == " ") {
        const range2 = document.createRange();
        range2.selectNode(a.nextSibling, 0);
              
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range2);
        selection.collapseToEnd();
      }

      return true;
    },
    processUrlTextNode(textNode) {
      const URL_REGEX = /http[s]?:\/\/(\w|[:/.%-]|#|!|@)+(\?(\w|[:/.%-]|=)+)?/;

      const textValue = textNode.nodeValue;
      const match = textValue.match(URL_REGEX);
      if (!match) return false;
      const range = document.createRange();
      range.setStart(textNode, match.index);
      range.setEnd(textNode, match.index + match[0].length);

      const a = document.createElement("a");
      a.setAttribute("href", match[0].trim());
      a.setAttribute("target", "_blank");
      a.setAttribute("contenteditable", "false");

      range.surroundContents(a);
      return true;
    },
    processTextNodes() {
      this._needProcessText = false;

      const walker = document.createTreeWalker(
        this.$refs.contentEditable,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      let textNode;
      let anyMatches = false;

      while ((textNode = walker.nextNode())) {
        if (!textNode.parentNode.closest("a")) {
          anyMatches |= this.processUrlTextNode(textNode);
          anyMatches |= this.processMentionTextNode(textNode);
        }
      }

      if (!anyMatches) this._spaceDetectRequired = true;
      //else this.moveCursorToEnd();
    },
    moveCursorToEnd() {
      const contentEditable = this.$refs.contentEditable;
      const r2 = document.createRange();
      r2.selectNode(
        contentEditable.childNodes[contentEditable.childNodes.length - 1]
      );

      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(r2);
      selection.collapseToEnd();
    },
    onContentChange() {
      if (this._needProcessText) {
        this.processTextNodes();
      }
      
      const html = this.getHTML();
      if (html != this.value) {
        this.$emit('input', html);
      }
    },
    tryEarlyTerminateTag(input, e) {
      if (this._atTagSelection) {
        const app = window.$App;
        const mentionList = app.$refs.mentionList;
        if (input.match(/\s/) || input == "Enter" || input == "Tab") {
          if (mentionList.accounts.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            mentionList.selectAccount(mentionList.accounts[0]);
            this.onSelectionChange();
          }
        }
      }
    },
    async onTextInput(e) {
      let input = e.data;
      //console.log(`onTextInput`, e.data, e.keyCode, e.key);

      if (input == "@") {
        this._atInput = true;
      } else {
        this.tryEarlyTerminateTag(input, e);
      }
    },
    async onKeyDown(e) {
      let input = e.key;
      //console.log(`onKeyDown`, e.data, e.keyCode, e.key);

      this.tryEarlyTerminateTag(input, e);
    },
    async onKeyUp(e) {
      let input = e.key;
      //console.log(`onKeyUp`, e.data, e.keyCode, e.key);

      if (e.key == "Backspace") {
        return this.onSelectionChange();
      }

      const selection = document.getSelection();
      if (selection.anchorNode?.nodeName != "#text") return;

      if (e.key == "@" || this._atInput) {
        //console.log(`Starting mention...`);
        this._atInput = false;
        this._atTagSelection = {
          anchorOffset: selection.anchorOffset,
          anchorNode: selection.anchorNode,
        };
      }

      const nodeValue = selection.anchorNode.nodeValue;
      const character = nodeValue.charAt(selection.anchorOffset - 1);
      input = character;

      if (input?.match(/\s$/)) {
        this._needProcessText = true;
        this.onContentChange();
      }
    },
    onPasteContent(e) {
      e.stopPropagation();
      e.preventDefault();

      const clipboardData = e.clipboardData ?? window.clipboardData;
      const pastedData =
        clipboardData.getData("text/html") || clipboardData.getData("text");
      const pastedHtml = sanitizeHTML(pastedData);

      this._spaceDetectRequired = false;
      this._needProcessText = true;
      document.execCommand("insertHTML", false, pastedHtml);
    },
    isSelectionContentEditable() {
      const selection = document.getSelection();
      if (!selection.anchorNode) return false;

      const anchorNode =
        selection.anchorNode.nodeName == "#text"
          ? selection.anchorNode.parentNode
          : selection.anchorNode;

      const $postEditorContent = anchorNode.closest(".post-editor-content");
      if ($postEditorContent == this.$refs.contentEditable.parentNode) {
        return true;
      }

      return false;
    },
    async onSelectionChange() {
      if (this.isSelectionContentEditable()) {
        const selection = document.getSelection();
        this._lastActiveSelection = selection;

        this.format = this.getFormat();

        if (this._atTagSelection) {
          if (this._atTagSelection.anchorNode != selection.anchorNode) {
            this._atTagSelection = null;
            this.closePopover("mentionlist");
          } else {
            if (this._atTagSelection.anchorOffset > selection.anchorOffset) {
              this._atTagSelection = null;
              this.closePopover("mentionlist");
            } else {
              const nodeValue = selection.anchorNode.nodeValue;

              const searchTerm = nodeValue.substring(
                this._atTagSelection.anchorOffset,
                selection.anchorOffset
              );

              if (searchTerm.match(/[^a-zA-Z0-9_]/)) {
                this._atTagSelection = null;
                this.closePopover("mentionlist");
              } else {
                await delay(50);
                if (this._atTagSelection)
                  await this.openMentionList(searchTerm);
              }
            }
          }
        }
      }
    },
    async openMentionList(searchTerm) {
      const containerPos = document
        .getSelection()
        ?.getRangeAt(0)
        ?.getClientRects()?.[0];
      if (!containerPos) return;

      const y = containerPos.y + containerPos.height;
      const x = containerPos.x + containerPos.width;

      const accounts = await api.Search.searchAccounts({
        username: searchTerm,
      });

      this.openPopover(
        "mentionlist",
        {},
        {
          debounce: 0,
          x,
          y,
          accounts,
          onSelectAccount: (a) => {

            this._needProcessText = true;

            const range = document.createRange();
            range.setStart(
              this._atTagSelection.anchorNode,
              this._atTagSelection.anchorOffset - 1
            );
            range.setEnd(
              this._atTagSelection.anchorNode,
              this._atTagSelection.anchorOffset + searchTerm.length
            );

            range.deleteContents();
            range.insertNode(document.createTextNode(`@${a.username} `));

            return true;
          },
        }
      );
    },
    uploadImage() {
      this.openDialog("imageupload", {
        onUpload: async (src) => {
          this.insertImage(src);
        },
      });
    },
    getFormat() {
      const format = {
        header: queryTagState("h1"),
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strike: document.queryCommandState("strikeThrough"),
        blockquote: queryTagState("blockquote"),
        ["code-block"]: queryTagState("pre"),
      };
      return format;
    },
    toggleFormat(name) {
      if (name == "removeFormat") {
        document.execCommand("removeFormat");
      } else if (name == "header") {
        toggleTag("h1");
      } else if (name == "bold") {
        document.execCommand("bold");
      } else if (name == "italic") {
        document.execCommand("italic");
      } else if (name == "underline") {
        document.execCommand("underline");
      } else if (name == "strike") {
        document.execCommand("strikeThrough");
      } else if (name == "blockquote") {
        toggleTag("blockquote");
      } else if (name == "code-block") {
        toggleTag("pre");
      }
    },
    insertImage(src) {
      const img = document.createElement("img");
      img.setAttribute("src", src);

      const lbr = document.createTextNode("\r\n\r\n");

      if (this.isSelectionContentEditable()) {
        const range = this._lastActiveSelection.getRangeAt(0);
        range.insertNode(lbr);
        range.insertNode(img);
        range.collapse(false); // deselect
      } else {
        // fall back
        const $el = this.$refs.contentEditable;
        $el.appendChild(img);
        $el.appendChild(lbr);
      }
    },
    test() {
      //this.insertImage("http://localhost:8080/assets/logo.png");
    },
    clear() {
      const $el = this.$refs.contentEditable;
      $el.innerHTML = "";
    },
    getHTML() {
      return this.$refs.contentEditable.innerHTML;
    },
    getState() {
      // handle any dangling
      this._spaceDetectRequired = false;
      this.processTextNodes();

      const html = this.getHTML();
      const htmlDocument = this.$refs.contentEditable;

      const hashtags = Array.from(
        htmlDocument.querySelectorAll('[data-denotation-char="#"]')
      )
        .map((node) => node.textContent.trim())
        .filter((s) => s.startsWith("#"))
        .map((s) => s.substring(1));

      const mentions = Array.from(
        htmlDocument.querySelectorAll('[data-denotation-char="@"]')
      )
        .map((node) => node.textContent.trim())
        .filter((s) => s.startsWith("@"))
        .map((s) => s.substring(1));

      //console.log(html);
      //console.log(hashtags);
      //console.log(mentions);

      return { html, hashtags, mentions };
    },
  },
};
</script>
