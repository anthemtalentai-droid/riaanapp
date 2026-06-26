This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
Two easy fixes — pick whichever feels simpler:

---

## Option A — Use Command Prompt (cmd) instead of PowerShell

PowerShell has this restriction, but the old-school `cmd` doesn't.

1. Press **Win + R**, type `cmd`, press Enter
2. Type: `cd E:\cwpainters`
3. Type: `npm run dev`

Done — no settings to change.

---

## Option B — Fix PowerShell (one-time, takes 10 seconds)

Run this once in PowerShell **as Administrator**:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Then type `Y` to confirm. After that, `npm run dev` will work normally in PowerShell forever.

---

**I'd recommend Option A for now** — it's instant, no admin rights needed, and gets you running. 

Option B is worth doing eventually if you prefer using PowerShell day-to-day.

Also notice you were in `C:\Users\fabri` — remember to `cd E:\cwpainters` first before running `npm run dev`, regardless of which terminal you use.
