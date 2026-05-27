import { setGlobalOptions } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import nodemailer from "nodemailer";

setGlobalOptions({ maxInstances: 10 });

initializeApp();
const db = getFirestore();

/** Sync Firestore user profile → Firebase Auth custom claims for Supabase RLS. */
export const syncUserClaims = onDocumentWritten("users/{userId}", async (event) => {
  const uid = event.params.userId;
  const after = event.data?.after?.data();
  if (!after) {
    try {
      await getAuth().setCustomUserClaims(uid, {});
    } catch {
      /* user may be deleted */
    }
    return;
  }

  let role = (after.role as string) || "customer";
  let staffType = (after.staffType as string) || null;
  const driverId = (after.driverId as string) || null;

  if (role === "driver") {
    role = "staff";
    staffType = "driver";
  }

  const claims: Record<string, string | null> = {
    role,
    staffType,
    driverId,
  };

  await getAuth().setCustomUserClaims(uid, claims);
});

/** Bookings live in Supabase; no-show is handled client-side (useNoShowMonitor). */
export const checkNoShows = onSchedule(
  {
    schedule: "every 30 minutes",
    timeZone: "Asia/Manila",
  },
  async () => {
    console.log(
      "checkNoShows: bookings are in Supabase; auto no-show runs via admin/support dashboard session."
    );
  }
);

const getSmtpTransport = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !user || !pass || !from) return null;

  return {
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    }),
    from,
  };
};

export const sendNotificationEmail = onDocumentCreated(
  "notifications/{id}",
  async (event) => {
    const payload = event.data?.data() || {};
    const channels = Array.isArray(payload.channels) ? payload.channels : ["in_app"];
    if (!channels.includes("email")) return;

    const smtp = getSmtpTransport();
    if (!smtp) {
      console.log("SMTP not configured; skipping email.");
      return;
    }

    const userId = payload.userId;
    if (!userId) return;

    const userSnap = await db.collection("users").doc(String(userId)).get();
    const user = userSnap.exists ? userSnap.data() : null;
    const to = user?.email;
    if (!to) return;

    const subject = payload.title || "Drive PH Notification";
    const text = `${payload.title || "Notification"}\n\n${payload.message || ""}\n\nOpen: ${payload.link || ""}`.trim();

    await smtp.transporter.sendMail({
      from: smtp.from,
      to,
      subject,
      text,
    });
  }
);
