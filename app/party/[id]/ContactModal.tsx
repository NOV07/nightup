"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  name: string;
  phone: string;
  email: string;
}

export default function ContactModal({ name, phone, email }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 rounded-xl font-semibold transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
      >
        Contact
      </button>

      {open &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              onClick={() => setOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 50,
                backgroundColor: "rgba(0,0,0,0.8)",
              }}
            />

            {/* Modal */}
            <div
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: 51,
                width: "100%",
                maxWidth: "400px",
                padding: "0 16px",
              }}
            >
              <div
                style={{
                  backgroundColor: "#1A1A2E",
                  border: "1px solid #E8A020",
                  borderRadius: "16px",
                  padding: "24px",
                  position: "relative",
                }}
              >
                {/* Close button */}
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  style={{
                    position: "absolute",
                    top: "16px",
                    right: "16px",
                    color: "#9CA3AF",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    lineHeight: 1,
                  }}
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Header */}
                <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px", paddingRight: "28px" }}>
                  {name}
                </h2>
                <p style={{ fontSize: "12px", color: "#9CA3AF", marginBottom: "24px" }}>
                  Contact information
                </p>

                {/* Phone */}
                <a
                  href={`tel:${phone}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "16px",
                    borderRadius: "12px",
                    marginBottom: "12px",
                    backgroundColor: "#16213E",
                    border: "1px solid #374151",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <span
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      backgroundColor: "#E8A020",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="20" height="20" fill="none" stroke="#0F0F1A" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </span>
                  <div>
                    <p style={{ fontSize: "11px", color: "#9CA3AF", marginBottom: "2px" }}>Phone</p>
                    <p style={{ fontSize: "14px", fontWeight: 500 }}>{phone}</p>
                  </div>
                </a>

                {/* Email */}
                <a
                  href={`mailto:${email}?subject=Inquiry from Nightup.gr`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "16px",
                    borderRadius: "12px",
                    marginBottom: "24px",
                    backgroundColor: "#16213E",
                    border: "1px solid #374151",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <span
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      backgroundColor: "#E8A020",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="20" height="20" fill="none" stroke="#0F0F1A" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <div>
                    <p style={{ fontSize: "11px", color: "#9CA3AF", marginBottom: "2px" }}>Email</p>
                    <p style={{ fontSize: "14px", fontWeight: 500 }}>{email}</p>
                  </div>
                </a>

                {/* Close button */}
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontWeight: 500,
                    backgroundColor: "#0F0F1A",
                    border: "1px solid #374151",
                    color: "#9CA3AF",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
