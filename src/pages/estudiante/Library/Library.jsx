import { useLibrary } from "../../../hooks/useLibrary";
import "./Library.css";

function Library() {
  const {
    resources,
    filteredResources,
    featuredResources,
    categories,

    search,
    setSearch,

    category,
    setCategory,

    clearFilters,

    isLoading,
    isError,
  } = useLibrary();

  const handleOpenResource = (resource) => {
    console.log("Abrir recurso:", resource);
  };

  return (
    <main className="library-page">
      {/* Encabezado */}
      <section className="library-header">
        <div>
          <span className="library-eyebrow">
            RECURSOS EDUCATIVOS
          </span>

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
            <strong>{Math.max(categories.length - 1, 0)}</strong>
            <span>Categorías</span>
          </div>
        </div>
      </section>

      {/* Estado de carga */}
      {isLoading && (
        <div className="library-empty">
          <div className="empty-icon">📚</div>

          <h3>Cargando biblioteca...</h3>

          <p>
            Estamos buscando las lecturas disponibles.
          </p>
        </div>
      )}

      {/* Estado de error */}
      {!isLoading && isError && (
        <div className="library-empty">
          <div className="empty-icon">⚠️</div>

          <h3>No se pudo cargar la biblioteca</h3>

          <p>
            Ocurrió un problema al obtener los recursos.
          </p>
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {/* Recursos destacados */}
          {featuredResources.length > 0 && (
            <section className="featured-section">
              <div className="section-heading">
                <div>
                  <h2>Destacados</h2>

                  <p>
                    Recursos recomendados para ti
                  </p>
                </div>
              </div>

              <div className="featured-grid">
                {featuredResources.map((resource) => (
                  <article
                    className="featured-card"
                    key={resource.id}
                  >
                    <div className="featured-icon">
                      {resource.icon || "📖"}
                    </div>

                    <div className="featured-content">
                      <span className="resource-type">
                        {resource.type || "Lectura"}
                      </span>

                      <h3>{resource.title}</h3>

                      <p>
                        {resource.description}
                      </p>

                      <button
                        className="library-button primary"
                        onClick={() =>
                          handleOpenResource(resource)
                        }
                      >
                        Abrir recurso

                        <span>→</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Biblioteca */}
          <section className="library-content">
            <div className="section-heading">
              <div>
                <h2>Todos los recursos</h2>

                <p>
                  Encuentra material según lo que quieras aprender
                </p>
              </div>
            </div>

            {/* Buscador */}
            <div className="library-toolbar">
              <div className="search-box">
                <span className="search-icon">
                  ⌕
                </span>

                <input
                  type="text"
                  placeholder="Buscar por palabra clave..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  aria-label="Buscar lecturas por palabra clave"
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

              {/* Categorías */}
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

            {/* Cantidad de resultados */}
            {(search || category !== "Todos") && (
              <div className="library-result-info">
                <span>
                  {filteredResources.length}{" "}
                  {filteredResources.length === 1
                    ? "resultado"
                    : "resultados"}
                </span>
              </div>
            )}

            {/* Resultados */}
            {filteredResources.length > 0 ? (
              <div className="resource-grid">
                {filteredResources.map((resource) => (
                  <article
                    className="resource-card"
                    key={resource.id}
                  >
                    <div className="resource-card-top">
                      <div className="resource-icon">
                        {resource.icon || "📖"}
                      </div>

                      <span className="resource-badge">
                        {resource.type || "Lectura"}
                      </span>
                    </div>

                    <div className="resource-card-body">
                      <span className="resource-category">
                        {resource.category || "Lectura"}
                      </span>

                      <h3>{resource.title}</h3>

                      <p>
                        {resource.description}
                      </p>

                      <div className="resource-footer">
                        <span className="resource-author">
                          {resource.author || "LectoGo"}
                        </span>

                        <button
                          className="open-resource"
                          onClick={() =>
                            handleOpenResource(resource)
                          }
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
                <div className="empty-icon">
                  🔎
                </div>

                <h3>
                  No encontramos lecturas
                </h3>

                <p>
                  No hay recursos que coincidan con
                  tu palabra clave o categoría.
                </p>

                <button
                  className="library-button primary"
                  onClick={clearFilters}
                >
                  Ver todas las lecturas
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

export default Library;