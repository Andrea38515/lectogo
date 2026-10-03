import ReadingCard from "../../../components/ReadingCard/ReadingCard";
{resources.map((resource) => {
  const propsMapeadas = {
    id: resource.id,
    title: resource.title,
    description: resource.description,
    image: resource.icon || null,
    category: resource.category || "General",
    difficulty: resource.type || "básico",
    readingTime: "5 min",
    progress: 0,
  };

  return (
    <ReadingCard
      key={resource.id}
      {...propsMapeadas}
      onRead={() => handleOpenResource(resource)}
    />
  );
})}