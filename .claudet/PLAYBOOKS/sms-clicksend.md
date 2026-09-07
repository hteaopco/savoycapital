# PLAYBOOK — SMS alerts (ClickSend)

How the owners find out an enquiry arrived, how to turn it on, and the one thing about SMS
that costs real money if you get it wrong.

Subsystem status: **code complete, off until `SMS_ALERT_TO` is set.** The credentials are
provisioned in Railway; the recipient list is not, so today every send is a no-op and the
Cold Reach badge is doing the work alone.

---

## 1. How it works

| Layer | File | What it does |
|---|---|---|
| Client + guards | `src/lib/sms.ts` | Basic auth, E.164 normalisation, GSM-7 guard, send budget |
| Trigger | `src/app/api/inquiries/route.ts` | `await notifyNewInquiry()` after the row lands |

One HTTP `POST` to `https://rest.clicksend.com/v3/sms/send` per recipient. Two recipients, so
`Promise.all` over two calls is fine; if that ever becomes dozens, put them in a single
`messages[]` array instead — the API takes one.

**The alert is a fixed string with no interpolation:**

> `New Savoy Capital enquiry. Open Cold Reach in the portal to read it.`

That is not laziness, it is the security answer. `POST /api/inquiries` is the only
unauthenticated write in the product, so a "first name" is attacker-controlled text. Putting
it in a text message means a stranger composes an SMS that arrives looking like it came from
Savoy. The who and the what stay behind the auth boundary. `src/lib/sms.ts`'s header calls
this Departure 1 and gives the full argument.

## 2. Environment

| Name | Purpose | Set? |
|---|---|---|
| `CLICKSEND_USERNAME` | Basic-auth user | Railway, per owner 2026-09-07 |
| `CLICKSEND_API_KEY` | Basic-auth pass | Railway, per owner 2026-09-07 |
| `SMS_ALERT_TO` | Comma-separated recipients | **Not set — this is what turns it on** |
| `CLICKSEND_SOURCE` | Optional reporting label, default `savoycapital` | Optional |

`SMS_ALERT_TO` takes US numbers in any format — `(337) 555-0147, 3375550148` is fine.
`toDialable()` normalises at the boundary and drops anything that is not ten digits.

**Nothing here is required to build or boot.** Absent credentials or an absent recipient list
make `sendSms` return `false` and the enquiry still lands, exactly like `DATABASE_URL` and the
`R2_*` set. CI builds with no secrets at all, and that property is load-bearing.

## 3. Bringing it up

1. Set `SMS_ALERT_TO` on the **app** service in Railway.
2. Submit the public contact form.
3. A text arrives within a few seconds; the badge increments either way.

If no text arrives, the app logs `[sms] …` on the failure path. There is no other signal —
see § 5.

---

## GOTCHA 1 — one wrong character triples the bill.

SMS bills per segment. A **GSM-7** segment is 160 characters. **One character outside that
alphabet silently switches the entire message to UCS-2, where a segment is 70.** A curly
apostrophe, a `·`, an em dash, an emoji, or an accented letter in a name will do it. This cost
theAPlink real money before it was caught: a short-looking alert billed three segments.

`smsSafe()` folds the usual suspects to ASCII and drops the rest. It runs **twice** — at
compose time and again inside `sendSms` — so no future caller can bypass it. Do not "simplify"
that second call away.

## GOTCHA 2 — HTTP 200 does not mean the message was accepted.

ClickSend answers 200 with an envelope. The verdict is `response_code === "SUCCESS"`. It can
also return a non-JSON error page, on which `res.json()` **throws** — which would take down
the caller if the send were not wrapped. Read the body as text, parse inside a `try`.

## GOTCHA 3 — `true` is not delivery.

It means ClickSend accepted the message. No delivery receipt is registered, there is no
callback URL, no inbound SMS, no retry, and no suppression list. Replies go nowhere. That last
one would be a compliance gap for anything customer-facing; it is acceptable here **only**
because the recipients are the two owners of the firm, texting themselves about their own
inbox. If this is ever pointed at anyone else, consent capture and opt-out come first.

## GOTCHA 4 — the send budget is per process, and says so.

`withinSendBudget()` caps alerts at 20/hour to bound what a spam run past the honeypot can
spend. Same honest limits as `rateLimit` in `src/lib/inquiries.ts`: it lives in one process's
memory, a horizontal scale-out multiplies it, and a deploy resets it. It is a speed bump on
cost, not a spend control. The durable version is a ClickSend account cap, which is not set.

## GOTCHA 5 — there are no quiet hours here, deliberately.

theAPlink holds alerts overnight and **drops** them rather than queueing. A cold inbound
arrives a few times a month here and the owner asked to be told, so holding is the wrong
default. If that changes, the wrap-midnight case (`19 → 8` is not a range check) and the
fixed-timezone hour are the two bits worth copying from theAPlink's
`quiet-hours-settings.ts` — a server-local hour is the thing most likely to be wrong in a
copy-paste.
