"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAxiosError } from "axios";

import LeadForm from "@/components/leads/LeadForm";
import { LoadingState, ErrorState } from "@/components/leads/StatusMessage";
import { useAuth } from "@/context/AuthContext";
import {
  createLead,
  fetchAssignableUsers,
  fetchCategories,
  fetchStages,
} from "@/lib/leadsService";
import type {
  AssignableUser,
  LeadFormData,
  LeadStage,
  ProductCategory,
} from "@/types/lead";

const emptyForm: LeadFormData = {
  customer_name: "",
  company_name: "",
  contact_person: "",
  phone: "",
  email: "",
  estimated_value: "0",
  category: "",
  stage: "",
  next_followup_date: "",
  notes: "",
  assigned_to: "",
  lead_source: "OTHER",
};

export default function NewLeadPage() {
  const router = useRouter();
  const { isCEO, isSalesHead } = useAuth();
  const canAssign = isCEO || isSalesHead;

  const [stages, setStages] = useState<LeadStage[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [initialValues, setInitialValues] = useState<LeadFormData>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [stageData, categoryData] = await Promise.all([
          fetchStages(),
          fetchCategories(),
        ]);
        setStages(stageData);
        setCategories(categoryData);

        const defaultStage =
          stageData.find((item) => item.name === "New")?.id || stageData[0]?.id || "";

        setInitialValues((current) => ({
          ...current,
          stage: defaultStage,
          category: categoryData[0]?.id || "",
        }));

        if (canAssign) {
          const users = await fetchAssignableUsers();
          setAssignableUsers(users);
        }
      } catch {
        setLoadError("Unable to load form options.");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [canAssign]);

  async function handleSubmit(values: LeadFormData) {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const payload: LeadFormData = {
        ...values,
        estimated_value: values.estimated_value || "0",
        lead_source: "OTHER",
      };
      if (!canAssign) {
        delete payload.assigned_to;
      } else if (!payload.assigned_to) {
        delete payload.assigned_to;
      }
      if (!payload.next_followup_date) {
        delete payload.next_followup_date;
      }

      const lead = await createLead(payload);
      router.push(`/leads/${lead.id}`);
    } catch (error) {
      if (isAxiosError(error)) {
        const data = error.response?.data;
        if (typeof data === "object" && data) {
          const firstError = Object.values(data)[0];
          setSubmitError(
            Array.isArray(firstError)
              ? String(firstError[0])
              : "Unable to create lead.",
          );
        } else {
          setSubmitError("Unable to create lead.");
        }
      } else {
        setSubmitError("Unable to create lead.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <LoadingState message="Preparing lead form..." />;
  }

  if (loadError) {
    return <ErrorState message={loadError} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/leads" className="text-sm text-teal-700 hover:text-teal-800">
          ← Back to leads
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Create Lead</h1>
        <p className="mt-1 text-sm text-slate-500">
          {canAssign
            ? "Create a lead and optionally assign it to a salesperson."
            : "This lead will be assigned to you automatically."}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <LeadForm
          mode="create"
          initialValues={initialValues}
          stages={stages}
          categories={categories}
          assignableUsers={assignableUsers}
          canAssign={canAssign}
          isSubmitting={isSubmitting}
          error={submitError}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
