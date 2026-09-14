import React, { useMemo, useState } from "react";
import "./Library.css";

const resources = [
  {
    id: 1,
    title: "Comprensión lectora",
    description:
      "Material para mejorar la comprensión, análisis e interpretación de textos.",
    category: "Lectura",
    type: "Libro",
    author: "FocUsly",
    icon: "📖",
    featured: true,
  },
  {
    id: 2,
    title: "Técnicas de estudio",
    description:
      "Estrategias prácticas para organizar el tiempo y mejorar el aprendizaje.",
    category: "Estudio",
    type: "Guía",
    author: "FocUsly",
    icon: "📝",
    featured: true,
  },
  {
    id: 3,
    title: "Literatura universal",
    description:
      "Recorrido por diferentes épocas, autores y obras importantes.",
    category: "Literatura",
    type: "Libro",
    author: "Biblioteca FocUsly",
    icon: "📚",
    featured: false,
  },
  {
    id: 4,
    title: "Pensamiento crítico",
    description:
      "Recursos para desarrollar el análisis y la argumentación.",
    category: "Filosofía",
    type: "Guía",
    author: "FocUsly",
    icon: "💡",
    featured: false,
  },
  {
    id: 5,
    title: "Lectura rápida",
    description:
      "Aprende técnicas para mejorar la velocidad y comprensión durante la lectura.",
    category: "Lectura",
    type: "Curso",
    author: "FocUsly",
    icon: "⚡",
    featured: false,
  },
  {
    id: 6,
    title: "Ortografía y escritura",
    description:
      "Ejercicios para fortalecer la escritura y el uso correcto del idioma.",
    category: "Lenguaje",
    type: "Guía",
    author: "Biblioteca FocUsly",
    icon: "✍️",
    featured: false,
  },
];

const categories = [
  "Todos",
  "Lectura",
  "Estudio",
  "Literatura",
  "Filosofía",
  "Lenguaje",
];

function Library() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");

  const filteredResources = useMemo(() => {
    return resources.filter((resource) => {
      const matchesCategory =
        category === "Todos" || resource.category === category;

      const searchText = search.toLowerCase().trim();

      const matchesSearch =
        !searchText ||
        resource.title.toLowerCase().includes(searchText) ||
        resource.description.toLowerCase().includes(searchText) ||
        resource.author.toLowerCase().includes(searchText);

      return matchesCategory && matchesSearch;
    });
  }, [search, category]);

  const featuredResources = resources.filter(
    (resource) => resource.featured
  );

  const handleOpenResource = (resource) => {
    console.log("Abrir recurso:", resource);
  };

  return (
    <main className="library-page">
      {/* Encabezado */}
      <section className="library-header">
        <div>
          <span className="library-eyebrow">RECURSOS EDUCATIVOS</span>

          <h1 className="library-title">
            Mi biblioteca <span>📚</span>
          </h1>

          <p className="library-description">
            Explora libros, guías y recursos para fortalecer tu aprendizaje.
          </p>
        </div>

        <div className="library-stats">
          <div className="library-stat">
            <strong>{resources.length}</strong>
            <span>Recursos</span>
          </div>

          <div className="library-stat">
            <strong>{categories.length - 1}</strong>
            <span>Categorías</span>
          </div>
        </div>
      </section>

      {/* Recursos destacados */}
      <section className="featured-section">
        <div className="section-heading">
          <div>
            <h2>Destacados</h2>
            <p>Recursos recomendados para ti</p>
          </div>
        </div>

        <div className="featured-grid">
          {featuredResources.map((resource) => (
            <article className="featured-card" key={resource.id}>
              <div className="featured-icon">{resource.icon}</div>

              <div className="featured-content">
                <span className="resource-type">{resource.type}</span>

                <h3>{resource.title}</h3>

                <p>{resource.description}</p>

                <button
                  className="library-button primary"
                  onClick={() => handleOpenResource(resource)}
                >
                  Abrir recurso
                  <span>→</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Biblioteca */}
      <section className="library-content">
        <div className="section-heading">
          <div>
            <h2>Todos los recursos</h2>
            <p>Encuentra material según lo que quieras aprender</p>
          </div>
        </div>

        {/* Buscador */}
        <div className="library-toolbar">
          <div className="search-box">
            <span className="search-icon">⌕</span>

            <input
              type="text"
              placeholder="Buscar en la biblioteca..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            {search && (
              <button
                className="clear-search"
                onClick={() => setSearch("")}
                aria-label="Limpiar búsqueda"
              >
                ×
              </button>
            )}
          </div>

          <div className="category-filters">
            {categories.map((item) => (
              <button
                key={item}
                className={`category-button ${
                  category === item ? "active" : ""
                }`}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Resultado */}
        {filteredResources.length > 0 ? (
          <div className="resource-grid">
            {filteredResources.map((resource) => (
              <article className="resource-card" key={resource.id}>
                <div className="resource-card-top">
                  <div className="resource-icon">{resource.icon}</div>

                  <span className="resource-badge">
                    {resource.type}
                  </span>
                </div>

                <div className="resource-card-body">
                  <span className="resource-category">
                    {resource.category}
                  </span>

                  <h3>{resource.title}</h3>

                  <p>{resource.description}</p>

                  <div className="resource-footer">
                    <span className="resource-author">
                      {resource.author}
                    </span>

                    <button
                      className="open-resource"
                      onClick={() => handleOpenResource(resource)}
                      aria-label={`Abrir ${resource.title}`}
                    >
                      →
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="library-empty">
            <div className="empty-icon">🔎</div>

            <h3>No encontramos recursos</h3>

            <p>
              Intenta buscar con otro término o selecciona otra categoría.
            </p>

            <button
              className="library-button primary"
              onClick={() => {
                setSearch("");
                setCategory("Todos");
              }}
            >
              Ver todos los recursos
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

export default Library;

