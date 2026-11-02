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

// Date locale au format AAAA-MM-JJ.
function DateAujourdhui() {
    const date = new Date();
    const annee = date.getFullYear();
    const mois = String(date.getMonth() + 1).padStart(2, "0");
    const jour = String(date.getDate()).padStart(2, "0");

    return `${annee}-${mois}-${jour}`;
}

// Charger les tâches avant le premier affichage du composant.
function ChargerTaches() {
    try {
        const sauvegarde = localStorage.getItem(STORAGE_KEY);

        if (!sauvegarde) return [];

        const taches = JSON.parse(sauvegarde);

        const donneesValides =
            Array.isArray(taches) &&
            taches.every(
                (tache) =>
                    tache &&
                    typeof tache.Title === "string" &&
                    typeof tache.DateDebut === "string" &&
                    typeof tache.DateFin === "string" &&
                    typeof tache.Ressource === "string" &&
                    statuts.some(
                        (statut) => statut.valeur === tache.Status
                    )
            );

        return donneesValides ? taches : [];
    } catch (erreur) {
        console.error("Erreur de chargement :", erreur);
        return [];
    }
}

export default function TaskManager() {
    const [Title, SetTitle] = useState("");
    const [DateDebut, SetDateDebut] = useState("");
    const [DateFin, SetDateFin] = useState("");
    const [Ressource, SetRessource] = useState("");
    const [Status, SetStatus] = useState("");

    const [Tasks, SetTasks] = useState(ChargerTaches);
    const [IndexModification, SetIndexModification] = useState(null);

    const [Aujourdhui, SetAujourdhui] = useState(DateAujourdhui);
    const [ErreurSauvegarde, SetErreurSauvegarde] = useState("");

    // Sauvegarde après chaque ajout, modification ou suppression.
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

    // Actualiser les retards si la page reste ouverte après minuit.
    useEffect(() => {
        function ActualiserDate() {
            SetAujourdhui(DateAujourdhui());
        }

        const intervalle = window.setInterval(ActualiserDate, 1000);
        window.addEventListener("focus", ActualiserDate);

        return () => {
            window.clearInterval(intervalle);
            window.removeEventListener("focus", ActualiserDate);
        };
    }, []);

    function EstEnRetard(tache) {
        return (
            tache.Status !== "done" &&
            Boolean(tache.DateFin) &&
            tache.DateFin < Aujourdhui
        );
    }

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

    function AnnulerModification() {
        SetTitle("");
        SetDateDebut("");
        SetDateFin("");
        SetRessource("");
        SetStatus("");
        SetIndexModification(null);
    }

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
            Status
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

    function Modifier(index) {
        const Task = Tasks[index];

        SetTitle(Task.Title);
        SetDateDebut(Task.DateDebut);
        SetDateFin(Task.DateFin);
        SetRessource(Task.Ressource);
        SetStatus(Task.Status);
        SetIndexModification(index);
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

            {/* Formulaire et graphique côte à côte */}
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
                        {Tasks.length} tâche(s)
                    </span>
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
                                <th scope="col">Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {Tasks.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="empty-state">
                                        Aucune tâche. Ajoutez votre première tâche.
                                    </td>
                                </tr>
                            ) : (
                                Tasks.map((Task, index) => {
                                    const statut = statuts.find(
                                        (s) => s.valeur === Task.Status
                                    );

                                    const enRetard = EstEnRetard(Task);

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