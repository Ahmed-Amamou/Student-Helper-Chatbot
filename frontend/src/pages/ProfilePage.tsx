import { useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Save, GraduationCap } from "lucide-react";

const DISCIPLINES = [
  "Génie Informatique",
  "Génie Mécanique",
  "Génie Électrique",
  "Génie Civil",
  "Mathématiques Appliquées et Modélisation",
  "Génie Industriel",
];

const YEARS = [1, 2, 3] as const;

const YEAR_SEMESTERS: Record<number, string[]> = {
  1: ["S1", "S2"],
  2: ["S3", "S4"],
  3: ["S5", "S6"],
};

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const [searchParams] = useSearchParams();
  const isOnboarding = searchParams.get("setup") === "true";

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [discipline, setDiscipline] = useState(user?.discipline || "");
  const [yearOfStudy, setYearOfStudy] = useState<number | "">(
    user?.year_of_study || ""
  );
  const [semester, setSemester] = useState(user?.semester || "");
  const [classGroup, setClassGroup] = useState(user?.class_group || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const availableSemesters = yearOfStudy
    ? YEAR_SEMESTERS[yearOfStudy] || []
    : [];

  const handleYearChange = (val: string) => {
    const year = val ? parseInt(val) : "";
    setYearOfStudy(year as number | "");
    // Reset semester if it doesn't belong to the new year
    if (year && !YEAR_SEMESTERS[year as number]?.includes(semester)) {
      setSemester("");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateProfile({
        full_name: fullName,
        discipline: discipline || null,
        year_of_study: yearOfStudy || null,
        semester: semester || null,
        class_group: classGroup || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-md mx-auto py-12 px-4 space-y-8">
        {/* Onboarding welcome */}
        {isOnboarding && (
          <div className="text-center space-y-2 bg-primary/5 border border-primary/20 rounded-lg p-5">
            <GraduationCap className="w-8 h-8 text-primary mx-auto" />
            <h2 className="text-lg font-semibold">
              Welcome to Student Helper!
            </h2>
            <p className="text-sm text-muted-foreground">
              Tell us about your studies at ENSIT so we can personalize your
              experience and show you the most relevant course materials.
            </p>
          </div>
        )}

        {/* Avatar + basic info */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <User className="w-8 h-8 text-primary" />
            )}
          </div>
          <h1 className="text-xl font-bold">{user?.full_name}</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary mt-2 capitalize">
            {user?.role}
          </span>
        </div>

        {/* Profile form */}
        <div className="space-y-4 bg-card border border-border rounded-lg p-5">
          <h2 className="text-sm font-semibold text-foreground">
            Student Profile — ENSIT
          </h2>
          <p className="text-xs text-muted-foreground">
            This info helps us prioritize relevant course materials and tailor
            answers to your discipline and level.
          </p>

          <div className="space-y-3">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Full Name
              </label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            {/* Discipline */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Discipline
              </label>
              <select
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select your discipline</option>
                {DISCIPLINES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Year of Study */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Year of Study
              </label>
              <select
                value={yearOfStudy}
                onChange={(e) => handleYearChange(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select year</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y === 1
                      ? "1ère année"
                      : y === 2
                      ? "2ème année"
                      : "3ème année"}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester (filtered by year) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Current Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                disabled={!yearOfStudy}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                <option value="">
                  {yearOfStudy ? "Select semester" : "Select year first"}
                </option>
                {availableSemesters.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Class Group */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Class Group
              </label>
              <Input
                placeholder="e.g. A, B, C"
                value={classGroup}
                onChange={(e) => setClassGroup(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full gap-2"
          >
            <Save className="w-4 h-4" />
            {saving
              ? "Saving..."
              : saved
              ? "Saved!"
              : isOnboarding
              ? "Save & Start Chatting"
              : "Save Profile"}
          </Button>
        </div>
      </div>
    </div>
  );
}
