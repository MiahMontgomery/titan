import { useEffect, useState } from "react";
import { getPersonas, createPersona, updatePersona, deletePersona, testCredentials } from "@/lib/api";
import { CredentialsManager } from "@/components/CredentialsManager";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Key, ArrowLeft } from "lucide-react";
import type { Persona, InsertPersona } from "@shared/schema";

export default function PersonaManager() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editPersona, setEditPersona] = useState<Persona | null>(null);
  const [form, setForm] = useState<Partial<InsertPersona>>({ name: "", avatar: "", credentials: {}, strategy: "", schedule: "" });
  const [saving, setSaving] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);

  useEffect(() => {
    fetchPersonas();
  }, []);

  async function fetchPersonas() {
    setLoading(true);
    setPersonas(await getPersonas());
    setLoading(false);
  }

  function openAddModal() {
    setEditPersona(null);
    setForm({ name: "", avatar: "", credentials: {}, strategy: "", schedule: "" });
    setModalOpen(true);
  }

  function openEditModal(persona: Persona) {
    setEditPersona(persona);
    setForm({ ...persona });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editPersona) {
        await updatePersona(editPersona.id, form as InsertPersona);
      } else {
        await createPersona(form as InsertPersona);
      }
      setModalOpen(false);
      fetchPersonas();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this persona?")) return;
    await deletePersona(id);
    fetchPersonas();
  }

  async function handleCredentialsSave(credentials: Record<string, any>) {
    if (!selectedPersona) return;
    
    const updatedPersona = await updatePersona(selectedPersona.id, {
      ...selectedPersona,
      credentials
    });
    
    setSelectedPersona(updatedPersona);
    fetchPersonas();
  }

  async function testCredentialsForPlatform(platform: string, credentials: Record<string, any>): Promise<boolean> {
    if (!selectedPersona) return false;
    
    try {
      const result = await testCredentials(selectedPersona.id, platform, credentials);
      return result.success;
    } catch (error) {
      console.error('Failed to test credentials:', error);
      return false;
    }
  }

  if (selectedPersona) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => setSelectedPersona(null)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Personas
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {selectedPersona.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage credentials and settings for this persona
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <CredentialsManager
              personaId={selectedPersona.id}
              initialCredentials={selectedPersona.credentials || {}}
              onSave={handleCredentialsSave}
              onTest={testCredentialsForPlatform}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Persona Manager
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create and manage AI personas for your projects
          </p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="w-4 h-4 mr-2" />
          Add Persona
        </Button>
      </div>

      {/* Personas Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600 dark:text-gray-400">Loading personas...</div>
        </div>
      ) : personas.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Key className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No personas yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create your first persona to get started with AI automation
            </p>
            <Button onClick={openAddModal}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Persona
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {personas.map((persona) => (
            <Card key={persona.id} className="hover:shadow-medium transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {persona.avatar ? (
                      <img 
                        src={persona.avatar} 
                        alt={persona.name} 
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">
                          {persona.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {persona.name}
                      </h3>
                      {persona.strategy && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {persona.strategy}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openEditModal(persona)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedPersona(persona)}
                    className="flex-1"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Credentials
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDelete(persona.id)}
                    className="text-error-600 hover:text-error-700 hover:bg-error-50 dark:hover:bg-error-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editPersona ? "Edit Persona" : "Add Persona"}</CardTitle>
              <CardDescription>
                {editPersona ? "Update persona details" : "Create a new AI persona"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={form.name || ""}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-surface-dark-secondary text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Avatar URL
                  </label>
                  <input
                    type="url"
                    value={form.avatar || ""}
                    onChange={(e) => setForm(f => ({ ...f, avatar: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-surface-dark-secondary text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Strategy
                  </label>
                  <input
                    type="text"
                    value={form.strategy || ""}
                    onChange={(e) => setForm(f => ({ ...f, strategy: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-surface-dark-secondary text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Schedule
                  </label>
                  <input
                    type="text"
                    value={form.schedule || ""}
                    onChange={(e) => setForm(f => ({ ...f, schedule: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-surface-dark-secondary text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setModalOpen(false)}
                    className="flex-1"
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 