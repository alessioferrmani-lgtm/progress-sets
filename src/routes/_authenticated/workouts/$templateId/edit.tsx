import { createFileRoute } from "@tanstack/react-router";
import { TemplateEditor } from "../new";

export const Route = createFileRoute("/_authenticated/workouts/$templateId/edit")({
  component: EditPage,
});

function EditPage() {
  const { templateId } = Route.useParams();
  return <TemplateEditor mode="edit" templateId={templateId} />;
}
