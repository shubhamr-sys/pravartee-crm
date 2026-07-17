"use client";

import { useState } from "react";
import { isAxiosError } from "axios";

import { formFieldClass, formLabelClass } from "@/lib/formStyles";
import { GeolocationError, getCurrentPosition } from "@/lib/geolocation";
import { validateIndianMobile } from "@/lib/phoneValidation";
import { checkInVisit, checkOutVisit } from "@/lib/visitsService";
import type { FieldVisit } from "@/types/visit";

interface VisitCheckButtonsProps {
  activeVisit: FieldVisit | null;
  onSuccess: () => void;
}

function apiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof GeolocationError) return err.message;
  if (isAxiosError(err)) {
    const detail = err.response?.data;
    if (typeof detail === "string") return detail;
    if (typeof detail === "object" && detail) {
      if (typeof detail.detail === "string") return detail.detail;
      const first = Object.values(detail)[0];
      if (Array.isArray(first)) return String(first[0]);
      if (typeof first === "string") return first;
    }
  }
  return fallback;
}

export default function VisitCheckButtons({
  activeVisit,
  onSuccess,
}: VisitCheckButtonsProps) {
  const [departmentName, setDepartmentName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [mobile, setMobile] = useState("");
  const [designation, setDesignation] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleCheckIn() {
    if (!departmentName.trim()) {
      setError("Enter the department / office name.");
      return;
    }
    if (!contactPerson.trim()) {
      setError("Enter the contact person name.");
      return;
    }
    const mobileError = validateIndianMobile(mobile);
    if (mobileError) {
      setError(mobileError);
      return;
    }

    setIsCheckingIn(true);
    setError(null);
    setSuccess(null);
    try {
      const position = await getCurrentPosition();
      const response = await checkInVisit({
        department_name: departmentName.trim(),
        contact_person: contactPerson.trim(),
        mobile: mobile.trim(),
        designation: designation.trim(),
        purpose: purpose.trim(),
        position,
      });
      setSuccess(response.message);
      setDepartmentName("");
      setContactPerson("");
      setMobile("");
      setDesignation("");
      setPurpose("");
      await onSuccess();
    } catch (err) {
      setError(apiErrorMessage(err, "Check-in failed."));
    } finally {
      setIsCheckingIn(false);
    }
  }

  async function handleCheckOut() {
    setIsCheckingOut(true);
    setError(null);
    setSuccess(null);
    try {
      const position = await getCurrentPosition();
      const response = await checkOutVisit({
        position,
        notes: notes.trim(),
      });
      setSuccess(
        `${response.message}${
          response.visit.duration_hours != null
            ? ` Duration: ${response.visit.duration_hours} hrs`
            : ""
        }`,
      );
      setNotes("");
      await onSuccess();
    } catch (err) {
      setError(apiErrorMessage(err, "Check-out failed."));
    } finally {
      setIsCheckingOut(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Field visit check-in</h2>
        <p className="mt-1 text-sm text-slate-500">
          Check in when you arrive at a client or government department. GPS is captured
          automatically.
        </p>
      </div>

      {activeVisit ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Active visit: {activeVisit.department_name}</p>
          <p className="mt-1 text-amber-800">
            Contact: {activeVisit.contact_person || "—"}
            {activeVisit.designation ? ` · ${activeVisit.designation}` : ""}
            {activeVisit.mobile ? ` · ${activeVisit.mobile}` : ""}
          </p>
          {activeVisit.purpose ? (
            <p className="mt-1 text-amber-800">Purpose: {activeVisit.purpose}</p>
          ) : null}
          <p className="mt-1 text-amber-800">
            Checked in at{" "}
            {new Date(activeVisit.check_in_time).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="visit-department" className={formLabelClass}>
              Department / office name *
            </label>
            <input
              id="visit-department"
              type="text"
              value={departmentName}
              onChange={(e) => setDepartmentName(e.target.value)}
              placeholder="e.g. PWD Delhi, MHA, Municipal Corp"
              className={formFieldClass}
            />
          </div>
          <div>
            <label htmlFor="visit-contact" className={formLabelClass}>
              Contact person *
            </label>
            <input
              id="visit-contact"
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="Name of the person you met"
              className={formFieldClass}
            />
          </div>
          <div>
            <label htmlFor="visit-mobile" className={formLabelClass}>
              Mobile no. *
            </label>
            <input
              id="visit-mobile"
              type="tel"
              inputMode="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="10-digit mobile number"
              className={formFieldClass}
            />
          </div>
          <div>
            <label htmlFor="visit-designation" className={formLabelClass}>
              Designation
            </label>
            <input
              id="visit-designation"
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Executive Engineer"
              className={formFieldClass}
            />
          </div>
          <div>
            <label htmlFor="visit-purpose" className={formLabelClass}>
              Purpose (optional)
            </label>
            <input
              id="visit-purpose"
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Tender discussion, follow-up meeting..."
              className={formFieldClass}
            />
          </div>
        </div>
      )}

      {activeVisit ? (
        <div>
          <label htmlFor="visit-notes" className={formLabelClass}>
            Check-out notes (optional)
          </label>
          <textarea
            id="visit-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Meeting outcome, next steps..."
            className={formFieldClass}
          />
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      ) : null}
      {success ? (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {success}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void handleCheckIn()}
          disabled={Boolean(activeVisit) || isCheckingIn}
          className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCheckingIn ? "Checking in..." : "Check in"}
        </button>
        <button
          type="button"
          onClick={() => void handleCheckOut()}
          disabled={!activeVisit || isCheckingOut}
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCheckingOut ? "Checking out..." : "Check out"}
        </button>
      </div>
    </section>
  );
}
