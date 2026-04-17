import { Link } from 'react-router-dom'
import { useTenant } from '../../hooks/useTenant'

export default function Home() {
    const { tenant } = useTenant()

    return (
        <div className="py-10 sm:py-14">
            <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                <div className="overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-indigo-100/60 shadow-xl">
                    <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
                        <div>
                            <span className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700 ring-1 ring-indigo-200">
                                Espai public del refugi
                            </span>

                            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
                                {tenant?.name || 'MatchCota'}
                            </h1>

                            <p className="mt-4 max-w-xl text-base text-gray-600 sm:text-lg">
                                Plataforma per connectar protectores amb adoptants i ajudar-te a trobar el company ideal.
                            </p>

                            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                                <Link
                                    to="/animals"
                                    className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:-translate-y-0.5 hover:bg-indigo-700"
                                >
                                    Veure Animals en Adopcio
                                </Link>
                                <Link
                                    to="/test"
                                    className="inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-semibold text-indigo-700 transition hover:-translate-y-0.5 hover:bg-indigo-50"
                                >
                                    Test de Compatibilitat
                                </Link>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur">
                            <h2 className="text-sm font-semibold uppercase tracking-wide text-indigo-700">Com començar</h2>
                            <ul className="mt-4 space-y-3 text-sm text-gray-600">
                                <li className="flex gap-2">
                                    <span className="mt-0.5 text-indigo-600">•</span>
                                    Explora els animals disponibles i les seves característiques.
                                </li>
                                <li className="flex gap-2">
                                    <span className="mt-0.5 text-indigo-600">•</span>
                                    Completa el test per veure els teus matches recomanats.
                                </li>
                                <li className="flex gap-2">
                                    <span className="mt-0.5 text-indigo-600">•</span>
                                    Contacta amb el refugi des de la pantalla de resultats.
                                </li>
                            </ul>
                        </div>
                    </div>
            </div>
            </section>
        </div>
    )
}
