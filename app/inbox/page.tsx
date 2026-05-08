"use client";

import { useRouter } from "next/navigation";

export default function InboxPage() {
  const router = useRouter();

  return (
    <div className="h-full flex items-center justify-center bg-wa-darker">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-wa-header flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="w-10 h-10 text-gray-500"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
            />
          </svg>
        </div>
        <h2 className="text-xl text-gray-300 font-light">Terra Segura</h2>
        <p className="text-gray-500 text-sm mt-2">
          Selecciona una conversación del panel izquierdo
        </p>
      </div>
    </div>
  );
}
