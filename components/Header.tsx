"use client";

import Link from "next/link";
import { Bell, Menu, Search, ShoppingBag } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const [search, setSearch] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();

    const value = search.trim();

    if (!value) return;

    window.location.href =
      `/search?q=${encodeURIComponent(value)}`;
  }

  return (
    <header className="pt-4">
      <div className="container">

        <div className="flex items-center justify-between gap-3">

          <Link
            href="/"
            className="text-[30px] font-black tracking-tight"
            style={{
              color: "#124f48",
              textShadow: "0 3px 12px rgba(10,70,60,.18)"
            }}
          >
            Rab7na
          </Link>

          <div className="flex items-center gap-2">

            <button
              className="relative grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-sm"
              aria-label="الإشعارات"
            >
              <Bell size={23} />
              <span className="absolute right-1 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-[#d8654d] px-1 text-[10px] font-bold text-white">
                3
              </span>
            </button>

            <button
              className="grid h-12 w-12 place-items-center rounded-2xl bg-[#dceae7]"
              aria-label="القائمة"
            >
              <Menu size={25} />
            </button>

          </div>
        </div>

        <form
          onSubmit={submit}
          className="mt-5 flex h-14 items-center gap-3 rounded-[28px] bg-white px-4 shadow-[0_8px_25px_rgba(30,70,65,.08)]"
        >
          <Search
            size={25}
            className="text-[#71827f]"
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن منتج..."
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#9ba9a7]"
          />

          <Link
            href="/cart"
            className="grid h-10 w-10 place-items-center rounded-full bg-[#eef7f5]"
          >
            <ShoppingBag size={20} />
          </Link>
        </form>

      </div>
    </header>
  );
}
