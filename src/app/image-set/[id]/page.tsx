import { ImageSetView } from "@/components/ImageSetView";

export default async function ImageSetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ImageSetView id={id} />;
}
