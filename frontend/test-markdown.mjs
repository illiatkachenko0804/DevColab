import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { Markdown } from 'tiptap-markdown'

const editor = new Editor({
  extensions: [
    StarterKit,
    Link.configure({ protocols: ['projects'] }),
    Markdown,
  ],
  content: '<a href="projects://task/123">Link</a>'
})

console.log(editor.storage.markdown.getMarkdown())
