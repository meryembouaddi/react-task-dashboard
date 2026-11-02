import { useState, useEffect } from "react";
import "./TaskManager.css";

import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer
} from "recharts";

const STORAGE_KEY = "taskmanager-taches";

const statuts = [
    {
        valeur: "to do",
        nom: "À faire",
        couleur: "#3498db",
        classe: "todo"
    },
    {
        valeur: "in progress",
        nom: "En cours",
        couleur: "#f39c12",
        classe: "progress"
    },
    {
        valeur: "done",
        nom: "Terminée",
        couleur: "#2ecc71",
        classe: "done"
    }
];

const priorites = ["Basse", "Moyenne", "Haute"];

function DateAujourdhui() {
    const date = new Date();
    const annee = date.getFullYear();
    const mois = String(date.getMonth() + 1).padStart(2, "0");
    const jour = String(date.getDate()).padStart(2, "0");

    return `${annee}-${mois}-${jour}`;
}

function NormaliserTache(tache) {
    return {
        Title: tache.Title,
        DateDebut: tache.DateDebut || "",
        DateFin: tache.DateFin || "",
        Ressource: tache.Ressource || "",
        Status: tache.Status,
        Priorite: priorites.includes(tache.Priorite)
            ? tache.Priorite
            : "Moyenne"
    };
}

function TacheValide(tache) {
    return (
        tache &&
        typeof tache.Title === "string" &&
        typeof tache.DateDebut === "string" &&
        typeof tache.DateFin === "string" &&
        typeof tache.Ressource === "string" &&
        statuts.some((statut) => statut.valeur === tache.Status)
    );
}

function ChargerTaches() {
    try {
        const sauvegarde = localStorage.getItem(STORAGE_KEY);

        if (!sauvegarde) return [];

        const taches = JSON.parse(sauvegarde);

        if (!Array.isArray(taches) || !taches.every(TacheValide)) {
            return [];
        }

        return taches.map(NormaliserTache);
    } catch (erreur) {
        console.error("Erreur de chargement :", erreur);
        return [];
    }
}

export default function TaskManager() {
    // Champs du formulaire
    const [Title, SetTitle] = useState("");
    const [DateDebut, SetDateDebut] = useState("");
    const [DateFin, SetDateFin] = useState("");
    const [Ressource, SetRessource] = useState("");
    const [Status, SetStatus] = useState("");
    const [Priorite, SetPriorite] = useState("Moyenne");

    // Liste des tâches
    const [Tasks, SetTasks] = useState(ChargerTaches);
    const [IndexModification, SetIndexModification] = useState(null);

    // Date et sauvegarde
    const [Aujourdhui, SetAujourdhui] = useState(DateAujourdhui);
    const [ErreurSauvegarde, SetErreurSauvegarde] = useState("");

    // Recherche et filtres
    const [Recherche, SetRecherche] = useState("");
    const [FiltreStatus, SetFiltreStatus] = useState("all");
    const [FiltreRetard, SetFiltreRetard] = useState("all");

    // Sauvegarder les tâches dans le navigateur après chaque changement
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(Tasks));
            SetErreurSauvegarde("");
        } catch (erreur) {
            console.error("Erreur de sauvegarde :", erreur);
            SetErreurSauvegarde(
                "La sauvegarde a échoué. Les dernières modifications " +
                "risquent d’être perdues après actualisation."
            );
        }
    }, [Tasks]);

    // Actualiser la date lorsque la page reste ouverte
    useEffect(() => {
        function ActualiserDate() {
            SetAujourdhui(DateAujourdhui());
        }

        const intervalle = window.setInterval(ActualiserDate, 60000);
        window.addEventListener("focus", ActualiserDate);

        return () => {
            window.clearInterval(intervalle);
            window.removeEventListener("focus", ActualiserDate);
        };
    }, []);

    // Vérifier si une tâche est en retard
    function EstEnRetard(tache) {
        return (
            tache.Status !== "done" &&
            Boolean(tache.DateFin) &&
            tache.DateFin < Aujourdhui
        );
    }

    // Statistiques du graphique
    const dataStatuts = statuts.map((statut) => ({
        name: statut.nom,
        value: Tasks.filter(
            (tache) => tache.Status === statut.valeur
        ).length,
        couleur: statut.couleur
    }));

    const NombreEnRetard = Tasks.filter(EstEnRetard).length;

    const NombreTerminees = Tasks.filter(
        (tache) => tache.Status === "done"
    ).length;

    const TauxCompletion =
        Tasks.length === 0
            ? 0
            : Math.round((NombreTerminees / Tasks.length) * 100);

    // Réinitialiser le formulaire
    function AnnulerModification() {
        SetTitle("");
        SetDateDebut("");
        SetDateFin("");
        SetRessource("");
        SetStatus("");
        SetPriorite("Moyenne");
        SetIndexModification(null);
    }

    // Ajouter ou modifier une tâche
    function AjouterTache(e) {
        e.preventDefault();

        if (Title.trim() === "") {
            alert("Veuillez saisir le nom de la tâche.");
            return;
        }

        if (!Status) {
            alert("Veuillez choisir un statut.");
            return;
        }

        if (!priorites.includes(Priorite)) {
            alert("Veuillez choisir une priorité valide.");
            return;
        }

        if (DateDebut && DateFin && DateFin < DateDebut) {
            alert(
                "La date de fin doit être égale ou postérieure " +
                "à la date de début."
            );
            return;
        }

        const Task = {
            Title: Title.trim(),
            DateDebut,
            DateFin,
            Ressource: Ressource.trim(),
            Status,
            Priorite
        };

        if (IndexModification === null) {
            SetTasks((anciennesTaches) => [...anciennesTaches, Task]);
        } else {
            SetTasks((anciennesTaches) =>
                anciennesTaches.map((tache, index) =>
                    index === IndexModification ? Task : tache
                )
            );
        }

        AnnulerModification();
    }

    // Supprimer une tâche
    function Supprimer(index) {
        SetTasks((anciennesTaches) =>
            anciennesTaches.filter((_, i) => i !== index)
        );

        if (IndexModification === index) {
            AnnulerModification();
        } else if (
            IndexModification !== null &&
            index < IndexModification
        ) {
            SetIndexModification((ancienIndex) => ancienIndex - 1);
        }
    }

    // Charger une tâche dans le formulaire pour modification
    function Modifier(index) {
        const Task = Tasks[index];

        SetTitle(Task.Title);
        SetDateDebut(Task.DateDebut);
        SetDateFin(Task.DateFin);
        SetRessource(Task.Ressource);
        SetStatus(Task.Status);
        SetPriorite(Task.Priorite || "Moyenne");
        SetIndexModification(index);

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // Recherche et filtres : on conserve l'index original
    const TachesFiltrees = Tasks
        .map((tache, index) => ({
            ...tache,
            indexOriginal: index
        }))
        .filter((tache) =>
            tache.Title.toLowerCase().includes(
                Recherche.toLowerCase().trim()
            )
        )
        .filter((tache) =>
            FiltreStatus === "all" ||
            tache.Status === FiltreStatus
        )
        .filter((tache) => {
            if (FiltreRetard === "late") {
                return EstEnRetard(tache);
            }

            if (FiltreRetard === "not-late") {
                return !EstEnRetard(tache);
            }

            return true;
        });

    // Exporter les tâches en fichier JSON
    function ExporterTaches() {
        const contenu = JSON.stringify(Tasks, null, 2);
        const fichier = new Blob(
            [contenu],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(fichier);
        const lien = document.createElement("a");

        lien.href = url;
        lien.download = "mes-taches.json";
        document.body.appendChild(lien);
        lien.click();
        lien.remove();

        URL.revokeObjectURL(url);
    }

    // Importer les tâches depuis un fichier JSON
    function ImporterTaches(e) {
        const fichier = e.target.files?.[0];

        if (!fichier) return;

        const lecteur = new FileReader();

        lecteur.onload = (event) => {
            try {
                const donnees = JSON.parse(event.target.result);

                if (
                    !Array.isArray(donnees) ||
                    !donnees.every(TacheValide)
                ) {
                    throw new Error("Format de fichier invalide.");
                }

                const tachesImportees = donnees.map(NormaliserTache);

                SetTasks(tachesImportees);
                AnnulerModification();

                SetRecherche("");
                SetFiltreStatus("all");
                SetFiltreRetard("all");

                alert("Importation réussie !");
            } catch (erreur) {
                console.error("Erreur d'importation :", erreur);
                alert(
                    "Erreur : le fichier JSON est invalide " +
                    "ou ne contient pas une liste de tâches valide."
                );
            }
        };

        lecteur.onerror = () => {
            alert("Impossible de lire le fichier.");
        };

        lecteur.readAsText(fichier);

        // Permet de sélectionner de nouveau le même fichier
        e.target.value = "";
    }

    return (
        <main className="task-manager">
            <header className="page-header">
                <h1>Tableau de bord des tâches</h1>
                <p>
                    Organisez vos tâches, suivez leur avancement
                    et surveillez les retards.
                </p>
            </header>

            {ErreurSauvegarde && (
                <p className="storage-error" role="alert">
                    {ErreurSauvegarde}
                </p>
            )}

            {/* Cartes KPI */}
            <section
                className="kpi-grid"
                aria-label="Indicateurs des tâches"
            >
                <article className="kpi-card kpi-total">
                    <span>Total des tâches</span>
                    <strong>{Tasks.length}</strong>
                    <small>Toutes les tâches enregistrées</small>
                </article>

                {dataStatuts.map((statut) => (
                    <article
                        key={statut.name}
                        className="kpi-card"
                        style={{ "--kpi-color": statut.couleur }}
                    >
                        <span>{statut.name}</span>
                        <strong>{statut.value}</strong>
                        <small>
                            {Tasks.length === 0
                                ? 0
                                : Math.round(
                                    (statut.value / Tasks.length) * 100
                                )}
                            % du total
                        </small>
                    </article>
                ))}

                <article className="kpi-card kpi-late">
                    <span>En retard</span>
                    <strong>{NombreEnRetard}</strong>
                    <small>Non terminées à leur échéance</small>
                </article>
            </section>

            {/* Formulaire et graphique */}
            <div className="dashboard-grid">
                <section className="card">
                    <h2>
                        {IndexModification === null
                            ? "Ajouter une tâche"
                            : "Modifier la tâche"}
                    </h2>

                    <form className="task-form" onSubmit={AjouterTache}>
                        <div className="form-group full-width">
                            <label htmlFor="title">Nom de la tâche</label>
                            <input
                                id="title"
                                type="text"
                                placeholder="Ex. : préparer la présentation"
                                value={Title}
                                onChange={(e) => SetTitle(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="date-debut">Date de début</label>
                            <input
                                id="date-debut"
                                type="date"
                                value={DateDebut}
                                onChange={(e) => SetDateDebut(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="date-fin">Date de fin</label>
                            <input
                                id="date-fin"
                                type="date"
                                min={DateDebut || undefined}
                                value={DateFin}
                                onChange={(e) => SetDateFin(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="ressource">Ressource</label>
                            <input
                                id="ressource"
                                type="text"
                                placeholder="Ex. : équipe développement"
                                value={Ressource}
                                onChange={(e) => SetRessource(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="status">Statut</label>
                            <select
                                id="status"
                                value={Status}
                                onChange={(e) => SetStatus(e.target.value)}
                                required
                            >
                                <option value="">Choisir un statut</option>

                                {statuts.map((statut) => (
                                    <option
                                        key={statut.valeur}
                                        value={statut.valeur}
                                    >
                                        {statut.nom}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="priorite">Priorité</label>
                            <select
                                id="priorite"
                                value={Priorite}
                                onChange={(e) => SetPriorite(e.target.value)}
                                required
                            >
                                {priorites.map((priorite) => (
                                    <option
                                        key={priorite}
                                        value={priorite}
                                    >
                                        {priorite}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-actions full-width">
                            <button type="submit" className="btn btn-primary">
                                {IndexModification === null
                                    ? "Ajouter la tâche"
                                    : "Enregistrer les modifications"}
                            </button>

                            {IndexModification !== null && (
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={AnnulerModification}
                                >
                                    Annuler
                                </button>
                            )}
                        </div>
                    </form>
                </section>

                <section className="card">
                    <h2>Répartition par statut</h2>

                    {Tasks.length === 0 ? (
                        <p className="empty-state">
                            Ajoutez des tâches pour afficher le graphique.
                        </p>
                    ) : (
                        <div
                            className="chart-container"
                            role="img"
                            aria-label={dataStatuts
                                .map((s) => `${s.name} : ${s.value}`)
                                .join(", ")}
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={dataStatuts}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="45%"
                                        innerRadius="45%"
                                        outerRadius="70%"
                                        paddingAngle={2}
                                        labelLine={false}
                                        label={({ percent }) =>
                                            percent > 0
                                                ? `${Math.round(percent * 100)}%`
                                                : ""
                                        }
                                    >
                                        {dataStatuts.map((statut) => (
                                            <Cell
                                                key={statut.name}
                                                fill={statut.couleur}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    <div className="completion-block">
                        <div className="completion-heading">
                            <span>Avancement global</span>
                            <strong>{TauxCompletion}%</strong>
                        </div>

                        <progress
                            className="completion-progress"
                            value={TauxCompletion}
                            max={100}
                            aria-label="Pourcentage de tâches terminées"
                        >
                            {TauxCompletion}%
                        </progress>

                        <p>
                            {NombreTerminees} tâche(s) terminée(s)
                            sur {Tasks.length}.
                        </p>
                    </div>
                </section>
            </div>

            {/* Tableau des tâches */}
            <section className="card">
                <div className="section-header">
                    <h2>Liste des tâches</h2>

                    <span className="task-count">
                        {TachesFiltrees.length} tâche(s) affichée(s) / {Tasks.length}
                    </span>
                </div>

                {/* Recherche et filtres */}
                <div className="filters-container">
                    <div className="form-group">
                        <label htmlFor="search">
                            Rechercher par titre
                        </label>
                        <input
                            id="search"
                            type="text"
                            placeholder="Saisir le titre..."
                            value={Recherche}
                            onChange={(e) => SetRecherche(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="filter-status">
                            Filtrer par statut
                        </label>
                        <select
                            id="filter-status"
                            value={FiltreStatus}
                            onChange={(e) => SetFiltreStatus(e.target.value)}
                        >
                            <option value="all">Tous les statuts</option>

                            {statuts.map((statut) => (
                                <option
                                    key={statut.valeur}
                                    value={statut.valeur}
                                >
                                    {statut.nom}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="filter-late">
                            État des échéances
                        </label>
                        <select
                            id="filter-late"
                            value={FiltreRetard}
                            onChange={(e) => SetFiltreRetard(e.target.value)}
                        >
                            <option value="all">Toutes les tâches</option>
                            <option value="late">En retard</option>
                            <option value="not-late">Pas en retard</option>
                        </select>
                    </div>
                </div>

                {/* Import et export */}
                <div className="import-export-actions">
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={ExporterTaches}
                    >
                        Exporter les tâches
                    </button>

                    <label className="btn btn-secondary import-label">
                        Importer les tâches
                        <input
                            type="file"
                            accept=".json,application/json"
                            onChange={ImporterTaches}
                            hidden
                        />
                    </label>
                </div>

                <div className="table-container">
                    <table className="task-table">
                        <thead>
                            <tr>
                                <th scope="col">Tâche</th>
                                <th scope="col">Début</th>
                                <th scope="col">Fin</th>
                                <th scope="col">Ressource</th>
                                <th scope="col">Statut</th>
                                <th scope="col">Priorité</th>
                                <th scope="col">Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {TachesFiltrees.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="empty-state">
                                        Aucune tâche ne correspond à votre recherche.
                                    </td>
                                </tr>
                            ) : (
                                TachesFiltrees.map((Task) => {
                                    const index = Task.indexOriginal;

                                    const statut = statuts.find(
                                        (s) => s.valeur === Task.Status
                                    );

                                    const enRetard = EstEnRetard(Task);
                                    const priorite = Task.Priorite || "Moyenne";

                                    return (
                                        <tr
                                            key={index}
                                            className={
                                                enRetard ? "task-overdue" : ""
                                            }
                                        >
                                            <td>
                                                <span className="task-title">
                                                    {Task.Title}
                                                </span>

                                                {enRetard && (
                                                    <span className="overdue-badge">
                                                        En retard
                                                    </span>
                                                )}
                                            </td>

                                            <td>{Task.DateDebut || "—"}</td>
                                            <td>{Task.DateFin || "—"}</td>
                                            <td>{Task.Ressource || "—"}</td>

                                            <td>
                                                <span
                                                    className={`status-badge ${statut.classe}`}
                                                >
                                                    {statut.nom}
                                                </span>
                                            </td>

                                            <td>
                                                <span
                                                    className={`priority-badge priority-${priorite.toLowerCase()}`}
                                                >
                                                    {priorite}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="table-actions">
                                                    <button
                                                        type="button"
                                                        className="btn btn-edit"
                                                        onClick={() => Modifier(index)}
                                                    >
                                                        Modifier
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="btn btn-delete"
                                                        onClick={() => Supprimer(index)}
                                                    >
                                                        Supprimer
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    );
}
