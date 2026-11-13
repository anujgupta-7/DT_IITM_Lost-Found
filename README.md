# InstiFound

One place that shows every found item on the IIT Madras campus and exactly where to collect it.

Built for the MS5015 Design Thinking project at DoMS, IIT Madras.

## What it does

- **Found items list.** Search by item, place or roll number. Every card says where the item is now.
- **30 second found post.** Photo, category, where it was found, and where it is now: at a desk, left in place, or with the finder. No sign in.
- **Desks.** Offices and security desks that keep found items get a private link. They log items and mark them returned.
- **ID card fast path.** Type the roll number and the owner is emailed directly. Cards are never photographed.
- **Lost reports.** Post once and get an email when a matching item turns up.
- **Closing the loop.** Mark as returned, the finder is told, and the owner can send a thank you.
- **QR posters.** A printable poster for any room or desk. Scanning it opens the app already knowing the location.
- **Impact page.** Live counts of items posted, returned and time to return.

## Stack

Next.js on Vercel, Neon Postgres, Vercel Blob for photos, Gmail for email.

## Environment variables

| Name | What it is |
|---|---|
| `DATABASE_URL` | Added by the Neon integration |
| `BLOB_READ_WRITE_TOKEN` | Added by the Blob integration |
| `ADMIN_KEY` | A passphrase you choose. Opens `/admin` |
| `GMAIL_USER` | The project Gmail address |
| `GMAIL_APP_PASSWORD` | A Gmail app password for that account |

Without the Gmail variables the app still works. It just doesn't send email.

## Run locally

```
npm install
npm run dev
```

With no `DATABASE_URL`, it uses an in-memory database, and the admin key is `dev`.
