"use client";

import { useState } from "react";
import {
  BookOpen, Edit, Trash2, Plus, Search, Save, X,
} from "lucide-react";

const initialContent = [
  { id: 1, type: "Activity", title: "Picture Talk", domain: "Language", ageGroup: "2-3 years", status: "Published" },
  { id: 2, type: "Activity", title: "Block Building", domain: "Cognitive", ageGroup: "3-4 years", status: "Published" },
  { id: 3, type: "Activity", title: "Action Games", domain: "Physical", ageGroup: "3-4 years", status: "Published" },
  { id: 4, type: "Activity", title: "Sharing Circle", domain: "Social", ageGroup: "4-5 years", status: "Published" },
  { id: 5, type: "Nutrition", title: "Nutritious Weaning Foods", domain: "Health", ageGroup: "0-2 years", status: "Published" },
  { id: 6, type: "Activity", title: "Rhyme Time", domain: "Language", ageGroup: "2-3 years", status: "Draft" },
];

export default function AdminContentPage() {
  const [content, setContent] = useState(initialContent);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const filtered = content.filter(
    (c) => c.title.toLowerCase().includes(search.toLowerCase()) || c.domain.toLowerCase().includes(search.toLowerCase()),
  );

  function removeItem(id: number) {
    setContent((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-stone-800">Content Management</h1>
          </div>
          <p className="text-stone-500 text-sm">Manage activities, educational content, and guidance materials.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Content
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search content..."
          className="input pl-10"
        />
      </div>

      {/* Content table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">Title</th>
              <th className="text-left px-4 py-3 font-medium">Domain</th>
              <th className="text-left px-4 py-3 font-medium">Age Group</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-stone-100 hover:bg-stone-50">
                <td className="px-4 py-3">
                  <span className="badge bg-indigo-50 text-indigo-600">{c.type}</span>
                </td>
                <td className="px-4 py-3 font-medium text-stone-800">{c.title}</td>
                <td className="px-4 py-3 text-stone-600">{c.domain}</td>
                <td className="px-4 py-3 text-stone-600">{c.ageGroup}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${c.status === "Published" ? "bg-forest/10 text-forest" : "bg-stone-100 text-stone-500"}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeItem(c.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-stone-400">
            <BookOpen className="w-10 h-10 mx-auto mb-2" />
            No content found.
          </div>
        )}
      </div>

      {/* Add content modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-stone-800">Add New Content</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-stone-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-stone-700 mb-1 block">Title</label>
                <input className="input" placeholder="Content title" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-stone-700 mb-1 block">Type</label>
                  <select className="input">
                    <option>Activity</option>
                    <option>Nutrition</option>
                    <option>Guidance</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-700 mb-1 block">Age Group</label>
                  <select className="input">
                    <option>0-2 years</option>
                    <option>2-3 years</option>
                    <option>3-4 years</option>
                    <option>4-5 years</option>
                    <option>5-6 years</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 mb-1 block">Domain</label>
                <select className="input">
                  <option>Physical</option>
                  <option>Cognitive</option>
                  <option>Language</option>
                  <option>Social</option>
                  <option>Emotional</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 mb-1 block">Content</label>
                <textarea className="input min-h-[100px]" placeholder="Content details..." />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button onClick={() => setShowForm(false)} className="btn-primary">
                <Save className="w-4 h-4" /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
