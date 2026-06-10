"use client";

import { useState } from "react";
import { isAxiosError } from "axios";

import { punchIn, punchOut } from "@/lib/attendanceService";
import { formatWorkingHoursDisplay } from "@/lib/attendanceUtils";
import { GeolocationError, getCurrentPosition } from "@/lib/geolocation";
import type { AttendanceRecord } from "@/types/attendance";

interface PunchButtonsProps {
  todayRecord: AttendanceRecord | null;
  onSuccess: () => void;
}

export default function PunchButtons({ todayRecord, onSuccess }: PunchButtonsProps) {
  const [isPunchingIn, setIsPunchingIn] = useState(false);
  const [isPunchingOut, setIsPunchingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasPunchedIn = Boolean(todayRecord?.punch_in_time);
  const hasPunchedOut = Boolean(todayRecord?.punch_out_time);
  const isComplete = hasPunchedIn && hasPunchedOut;

  async function handlePunchIn() {
    setIsPunchingIn(true);
    setError(null);
    setSuccess(null);
    try {
      const position = await getCurrentPosition();
      const response = await punchIn(position);
      setSuccess(`${response.message} You are now marked In Progress.`);
      await onSuccess();
    } catch (err) {
      if (err instanceof GeolocationError) {
        setError(err.message);
      } else if (isAxiosError(err)) {
        const detail = err.response?.data;
        if (typeof detail === "object" && detail) {
          const first = Object.values(detail)[0];
          setError(Array.isArray(first) ? String(first[0]) : "Punch in failed.");
        } else {
          setError("Punch in failed.");
        }
      } else {
        setError("Punch in failed.");
      }
    } finally {
      setIsPunchingIn(false);
    }
  }

  async function handlePunchOut() {
    setIsPunchingOut(true);
    setError(null);
    setSuccess(null);
    try {
      const position = await getCurrentPosition();
      const response = await punchOut(position);
      setSuccess(
        `${response.message} Working hours: ${formatWorkingHoursDisplay(response.working_hours)}`,
      );
      await onSuccess();
    } catch (err) {
      if (err instanceof GeolocationError) {
        setError(err.message);
      } else if (isAxiosError(err)) {
        const detail = err.response?.data;
        if (typeof detail === "object" && detail) {
          const first = Object.values(detail)[0];
          setError(Array.isArray(first) ? String(first[0]) : "Punch out failed.");
        } else {
          setError("Punch out failed.");
        }
      } else {
        setError("Punch out failed.");
      }
    } finally {
      setIsPunchingOut(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Punch Actions</h2>
      <p className="mt-1 text-sm text-slate-500">
        GPS location is captured when you punch in or out.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          role="status"
          className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {success}
        </div>
      )}

      {isComplete && (
        <p className="mt-4 text-sm text-slate-500">
          Attendance completed for today. Both punch actions are locked.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handlePunchIn}
          disabled={hasPunchedIn || isPunchingIn}
          aria-disabled={hasPunchedIn || isPunchingIn}
          className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPunchingIn ? "Punching In..." : "Punch In"}
        </button>
        <button
          type="button"
          onClick={handlePunchOut}
          disabled={!hasPunchedIn || hasPunchedOut || isPunchingOut}
          aria-disabled={!hasPunchedIn || hasPunchedOut || isPunchingOut}
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPunchingOut ? "Punching Out..." : "Punch Out"}
        </button>
      </div>
    </section>
  );
}
