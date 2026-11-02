
"use client";

import { useRef, useState } from "react";
import { Plus, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function ChatInput() {
  const [input, setInput] = useState("");
  const [showMenu, setShowMenu] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = event.target.files;

    if (!files?.length) return;

    console.log("Selected files:", Array.from(files));

    // Next step: Upload these files to your API.

    event.target.value = "";
    setShowMenu(false);
  }

  return (
    <div className="relative">
      {/* Selected files will appear here later */}

      <div className="relative flex items-end gap-2 rounded-2xl border bg-background p-2">

        {/* Plus menu */}
        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => setShowMenu(!showMenu)}
          >
            <Plus className="size-5" />
          </Button>

          {showMenu && (
            <div className="absolute bottom-14 left-0 z-50 w-52 rounded-xl border bg-popover p-2 shadow-lg">

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center gap-3 rounded-lg p-3 text-sm hover:bg-accent"
              >
                <Upload className="size-4" />
                Upload files
              </button>

            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          multiple
          hidden
          onChange={handleFileSelect}
        />

        {/* Message input */}
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask anything..."
          className="min-h-[44px] max-h-40 resize-none border-0 shadow-none focus-visible:ring-0"
          rows={1}
        />

        <Button
          type="button"
          size="icon"
          className="rounded-full"
          disabled={!input.trim()}
        >
          <FileText className="size-4" />
        </Button>
      </div>
    </div>
  );
}
