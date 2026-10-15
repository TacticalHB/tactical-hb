"use server";

import { requestBackInStock, type NotifyResult } from "@/lib/back-in-stock";

/* The product page's "Tell me when it's back" form. A filled honeypot gets
   the same "ok" a person would, and nothing is stored. */
export async function askBackInStock(email: string, slug: string, locale: string, website?: string): Promise<NotifyResult> {
  if (website) return "ok";
  return requestBackInStock(email, slug, locale);
}
