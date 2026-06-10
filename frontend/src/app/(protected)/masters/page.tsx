"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import {
  createMasterCategory,
  deleteMasterCategory,
  fetchMasterCategories,
  updateMasterCategory,
} from "@/lib/mastersService";
import type { MasterCategory } from "@/types/master";

interface CategoryFormState {
  name: string;
  description: string;
}

const emptyForm: CategoryFormState = { name: "", description: "" };

export default function CategoryMasterPage() {
  const [categories, setCategories] = useState<MasterCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MasterCategory | null>(null);
  const [form, setForm] = useState<CategoryFormState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCategories = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchMasterCategories();
      setCategories(data);
    } catch {
      setError("Unable to load categories.");
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  function openCreateModal() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEditModal(category: MasterCategory) {
    setEditing(category);
    setForm({
      name: category.name,
      description: category.description || "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Category name is required.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      if (editing) {
        await updateMasterCategory(editing.id, {
          name: form.name.trim(),
          description: form.description.trim(),
        });
      } else {
        await createMasterCategory({
          name: form.name.trim(),
          description: form.description.trim(),
        });
      }
      setModalOpen(false);
      setForm(emptyForm);
      setEditing(null);
      await loadCategories();
    } catch {
      setError("Unable to save category.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this category?")) return;
    setError(null);
    try {
      await deleteMasterCategory(id);
      await loadCategories();
    } catch {
      setError("Unable to delete category. It may be in use.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Category Master</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage product categories (IT, Non-IT, Solution). Products, brands,
            and models are added inline from lead forms.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
        >
          + Add Category
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((row) => (
              <tr key={row.id} className="border-b border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                <td className="px-4 py-3 text-slate-600">{row.description || "—"}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => openEditModal(row)}
                    className="mr-3 text-teal-700 hover:text-teal-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(row.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              {editing ? "Edit Category" : "Add Category"}
            </h3>
            <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Name
                </label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
