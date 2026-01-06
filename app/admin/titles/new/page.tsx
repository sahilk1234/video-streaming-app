import TitleForm from "@/components/admin/TitleForm";

export default function NewTitlePage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="font-display text-4xl text-text">Create title</h1>
        <p className="text-muted">Add a new movie or series to the catalog.</p>
      </div>
      <div className="glass rounded-3xl p-8">
        <TitleForm />
      </div>
    </div>
  );
}
