"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExt from "@tiptap/extension-image";
import LinkExt from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";

interface Props {
  initialContent: string;
  onChange: (html: string) => void;
}

const GOLD = "#E8A020";
const btnBase: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 600,
  background: "transparent",
  color: "#aaa",
};

export default function RichTextEditor({ initialContent, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageExt,
      LinkExt.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Write your article here..." }),
    ],
    content: initialContent || "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor || !initialContent) return;
    if (editor.getHTML() === initialContent) return;
    editor.commands.setContent(initialContent);
  }, [initialContent, editor]);

  if (!editor) return null;

  function tb(label: string, action: () => void, active: boolean) {
    return (
      <button
        type="button"
        key={label}
        onClick={action}
        style={{ ...btnBase, background: active ? GOLD : "transparent", color: active ? "#0F0F1A" : "#aaa" }}
      >
        {label}
      </button>
    );
  }

  function addLink() {
    const url = window.prompt("Enter URL:");
    if (url) editor?.chain().focus().setLink({ href: url }).run();
  }

  return (
    <div style={{ border: "1px solid #444", borderRadius: "12px", overflow: "hidden" }}>
      <div style={{ background: "#0D0D1A", padding: "8px 12px", display: "flex", flexWrap: "wrap", gap: "4px", borderBottom: "1px solid rgba(232,160,32,0.2)" }}>
        {tb("B", () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"))}
        {tb("I", () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"))}
        {tb("H2", () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 }))}
        {tb("H3", () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive("heading", { level: 3 }))}
        {tb("• List", () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList"))}
        {tb("1. List", () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList"))}
        {tb("❝", () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote"))}
        {tb("Link", addLink, editor.isActive("link"))}
        {tb("↩", () => editor.chain().focus().undo().run(), false)}
        {tb("↪", () => editor.chain().focus().redo().run(), false)}
      </div>
      <div style={{ background: "#0A0A14", minHeight: "400px", padding: "24px", color: "#fff" }}>
        <EditorContent editor={editor} />
      </div>
      <style>{`
        .ProseMirror { outline: none; min-height: 350px; color: #fff; }
        .ProseMirror:focus-within { box-shadow: 0 0 0 2px rgba(232,160,32,0.4); border-radius: 4px; }
        .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: #555; pointer-events: none; height: 0; }
        .ProseMirror h2 { font-size: 22px; font-weight: 600; margin: 24px 0 12px; color: #fff; }
        .ProseMirror h3 { font-size: 18px; font-weight: 500; margin: 20px 0 10px; color: #fff; }
        .ProseMirror p { margin-bottom: 16px; color: rgba(255,255,255,0.85); line-height: 1.7; }
        .ProseMirror strong { color: #fff; }
        .ProseMirror a { color: #E8A020; text-decoration: underline; }
        .ProseMirror blockquote { border-left: 3px solid #E8A020; padding-left: 16px; color: rgba(255,255,255,0.6); font-style: italic; margin: 16px 0; }
        .ProseMirror ul, .ProseMirror ol { padding-left: 24px; margin-bottom: 16px; color: rgba(255,255,255,0.85); }
        .ProseMirror li { margin-bottom: 6px; }
      `}</style>
    </div>
  );
}
