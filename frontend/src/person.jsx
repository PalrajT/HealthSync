import React from "react";

export default function Person({ className = "", ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`w-10 h-10 ${className}`}
      {...props}
    >
      {/* Head */}
      <circle cx="12" cy="7" r="4" />
      {/* Body */}
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6v1H4v-1z" />
    </svg>
  );
}

