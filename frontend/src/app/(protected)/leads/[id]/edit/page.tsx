"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";

import LeadForm from "@/components/leads/LeadForm";
import {
  ErrorState,
  LoadingState,
} from "@/components/leads/StatusMessage";
import { useAuth } from "@/context/AuthContext";
import { leadToFormData } from "@/lib/leadFormUtils";
import {
  fetchAssignableUsers,
  fetchCategories,
  fetchLead,
  fetchStages,
  updateLead,
} from "@/lib/leadsService";
import type {
  AssignableUser,
  Lead,
  LeadFormData,
  LeadStage,
  ProductCategory,
} from "@/types/lead";

export default function EditLeadPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isCEO, isSalesHead } = useAuth();
  const canAssign = isCEO || isSalesHead;

  const [lead, setLead] = useState<Lead | null>(null);
  const [initialValues, setInitialValues] = useState<LeadFormData | null>(null);
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [leadData, stageData, categoryData] = await Promise.all([
        fetchLead(params.id),
        fetchStages(),
        fetchCategories(),
      ]);
      setLead(leadData);
      setInitialValues(leadToFormData(leadData));
      setStages(stageData);
      setCategories(categoryData);

      if (canAssign) {
        const users = await fetchAssignableUsers();
        setAssignableUsers(users);
      }
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 403) {
        setError("You do not have permission to edit this lead.");
      } else {
        setError("Unable to load lead for editing.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [params.id, canAssign]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSubmit(values: LeadFormData) {
    if (!lead) return;
    setIsSubmitting(true);

    const submitValues = { ...values };
    if (!canAssign) {
      delete submitValues.assigned_to;
    }

    try {
      await updateLead(lead.id, submitValues);
      router.push(`/leads/${lead.id}?saved=1`);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <LoadingState message="Loading lead..." />;
  }

  if (error || !lead || !initialValues) {
    return <ErrorState message={error || "Lead not found."} onRetry={loadData} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/leads/${lead.id}`}
          className="text-sm text-teal-700 hover:text-teal-800"
        >
          ← Back to lead
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Edit Lead</h1>
        <p className="mt-1 text-sm text-slate-500">
          Update customer details, products, stage, notes
          {canAssign ? ", and assignment" : ""} for {lead.customer_name}.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <LeadForm
          key={`${lead.id}-${lead.updated_at}`}
          mode="edit"
          leadId={lead.id}
          initialDocuments={lead.documents ?? []}
          initialValues={initialValues}
          stages={stages}
          categories={categories}
          assignableUsers={assignableUsers}
          canAssign={canAssign}
          isSubmitting={isSubmitting}
          cancelHref={`/leads/${lead.id}`}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
