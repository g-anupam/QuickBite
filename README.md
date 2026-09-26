# QuickBite
QuickBite is a full Stack application for ordering food(similar to zomato and swiggy). Implements Role Based Access for Customers to place orders, restaurants to view, modify menu and accept orders and for drivers to deliver them.

Checkout https://quick-bite-inky.vercel.app/

This project is completed in NextJS with TypeScript, TailwindCSS and PostgreSQL database.
A sample env example has been attached. Create your respective `.env.local` file as per the example,
with `DATABASE_URL` pointing at your Postgres database (on Vercel, the Neon Postgres integration sets it for you).

The DB schema is given in `QuickBite_schema.sql` file. Apply it with:
```bash
psql "$DATABASE_URL" -f QuickBite_schema.sql
```
## To run the Development Server
```bash
npm i
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

*Note that this project is purely for development purposes and should not be used for production.  It is intended only to show our expertise in Full Stack Development. It does not infringe any copyright or intellectual property rights and does not gain any monetary benefits.*
