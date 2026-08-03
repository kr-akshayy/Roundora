# Intervuee — Mock Interview Marketplace (MVP)

## Kya bana hai

- **Landing page** — product pitch, kaise kaam karta hai
- **Signup/Login** — student ya mentor, dono role
- **Mentors listing** — sab verified interviewers ki list
- **Mentor profile + booking** — available slots dekh ke book karo
- **Dashboard** — student ke liye "my bookings", mentor ke liye "add slots + booked sessions"
- **Video call room** — Jitsi Meet embedded (100% free, koi API key nahi chahiye)
- **Profile photo upload** — student aur mentor dono apni photo upload/change kar sakte hain (navbar mein apna avatar dikhega, usi pe click karke edit profile page khulega)
- **Topic-wise interviews** — mentor apni profile mein topics select karta hai (DSA, System Design, Frontend, Backend, HR/Behavioral, Data Science/ML, Product Management). Slot banate time bhi topic tag karta hai. Students "Find a mentor" page pe topic filter chips se search kar sakte hain.
- **Ratings & reviews** — session "completed" mark hone ke baad student ek rating (1-5 stars) + comment de sakta hai. Ye mentor ke card aur profile pe average rating ke saath dikhta hai — students ke liye trust badhta hai.

**Note agar tumne pehle SQL already run kar diya tha**: is baar `supabase-schema.sql` mein kaafi naya add hua hai — `expertise` column, `topic` column, aur poora `reviews` table + policies. **Pura file dobara Supabase SQL Editor mein run kar do** — safe hai, sab `if not exists` / `on conflict` ke saath likha hai.

## Setup — pehli baar chalane ke liye

### 1. Supabase database banao
1. [supabase.com](https://supabase.com) pe apna project already bana hua hai (`.env` mein URL/key hai)
2. Supabase dashboard mein jao → **SQL Editor** → **New query**
3. `supabase-schema.sql` file ka pura content paste karo → **Run**
4. Ye 3 tables banayega: `profiles`, `slots`, `bookings` — with security rules already set

### 2. Local mein chalao
```bash
npm install
npm run dev
```
Browser mein `http://localhost:3000` khulega.

### 3. Test karo
1. Ek account banao role = **"I'm an interviewer"** se (yeh mentor hai)
2. Dashboard mein jaake **Edit profile** se apne topics select karo (jaise DSA, System Design)
3. Dashboard mein wapas aake us topic ke saath kuch time slots add karo
4. Doosra account banao role = **"I'm practicing"** se (yeh student hai)
5. "Find a mentor" pe jao, topic filter se search karo, mentor select karo, slot book karo
6. Dashboard se "Join call" dabao — video call khul jayega (Jitsi Meet)
7. Mentor account se wapas login karke us booking ko **"Mark done"** karo
8. Student account se wapas login karke us booking pe **"Leave a review"** de do — ab mentor ke card pe rating dikhegi

## Deploy karna (production)

Vercel already configured hai (`vercel.json`):
```bash
npm i -g vercel
vercel
```
Ya GitHub pe push karke Vercel dashboard se import karo — automatic deploy ho jayega.

**Zaroori**: Vercel project settings mein environment variables add karna mat bhoolna:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

(`.env` file Vercel pe upload nahi hoti security ke liye — Vercel dashboard mein manually add karo.)

## Abhi kya missing hai (next steps)

- **Payment**: Razorpay integrate nahi kiya abhi — booking free hai. Jab demand validate ho jaye, Razorpay Orders API add karna (isके liye ek chhota backend/Supabase Edge Function chahiye hoga, kyunki secret key client-side expose nahi kar sakte)
- **Email notifications**: Booking confirm hone pe email jaana chahiye (Resend ya Supabase's built-in email se ho sakta hai)
- **Mentor verification**: Abhi koi bhi "mentor" role se signup kar sakta hai — production mein admin approval flow chahiye hoga
- **Detailed post-session scorecard**: Abhi sirf star rating + free-text comment hai — agar structured feedback chahiye (jaise "communication: 4/5, problem-solving: 3/5"), woh alag feature hoga

## Tech Stack
Vite + React + TypeScript + Tailwind CSS + Supabase (auth + database) + Jitsi Meet (video) + Zustand (state)
