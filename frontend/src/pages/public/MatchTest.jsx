/**
 * COMPONENT PAGINA: MatchTest
 * ----------------------------------------------------------------------
 * Questionari de compatibilitat per trobar l'animal ideal.
 * Presenta les preguntes una a una amb navegacio entre elles.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../hooks/useTenant';
import { getQuestionnaire, calculateMatches } from '../../api/matching';

export default function MatchTest() {
    const navigate = useNavigate();
    const { tenant } = useTenant();

    // Estat del questionari
    const [questionnaire, setQuestionnaire] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Navegacio entre preguntes
    const [currentIndex, setCurrentIndex] = useState(0);

    // Respostes de l'usuari
    const [responses, setResponses] = useState({});

    // Estat d'enviament
    const [submitting, setSubmitting] = useState(false);

    // Carregar questionari
    useEffect(() => {
        const loadQuestionnaire = async () => {
            try {
                setLoading(true);
                const data = await getQuestionnaire(tenant?.slug);
                setQuestionnaire(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (tenant?.slug) {
            loadQuestionnaire();
        }
    }, [tenant?.slug]);

    // Pregunta actual
    const currentQuestion = questionnaire?.questions?.[currentIndex];
    const totalQuestions = questionnaire?.total_questions || 0;
    const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;

    // Handlers
    const handleOptionSelect = (value) => {
        const questionId = currentQuestion.id;
        const isMultiple = currentQuestion.type === 'multiple_choice';

        if (isMultiple) {
            // Multiple choice: toggle selection
            const currentSelection = responses[questionId] || [];
            let newSelection;

            if (value === 'none') {
                // Si seleccionen "no", deseleccionar tot el demes
                newSelection = [value];
            } else if (currentSelection.includes(value)) {
                // Deseleccionar
                newSelection = currentSelection.filter(v => v !== value);
            } else {
                // Seleccionar (i treure "none" si hi era)
                newSelection = [...currentSelection.filter(v => v !== 'none'), value];
            }

            setResponses({ ...responses, [questionId]: newSelection });
        } else {
            // Single choice
            setResponses({ ...responses, [questionId]: value });
        }
    };

    const isOptionSelected = (value) => {
        const questionId = currentQuestion?.id;
        const answer = responses[questionId];

        if (Array.isArray(answer)) {
            return answer.includes(value);
        }
        return answer === value;
    };

    const canProceed = () => {
        if (!currentQuestion) return false;
        const answer = responses[currentQuestion.id];

        if (currentQuestion.type === 'multiple_choice') {
            return Array.isArray(answer) && answer.length > 0;
        }
        return answer !== undefined && answer !== null;
    };

    const handleNext = async () => {
        if (currentIndex < totalQuestions - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            // Ultima pregunta - calcular matches directament
            await handleSubmit();
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleSubmit = async () => {
        try {
            setSubmitting(true);

            const requestData = {
                responses,
                limit: 10,
            };

            const results = await calculateMatches(tenant?.slug, requestData);

            // Navegar als resultats passant les dades per state
            navigate('/test/results', { state: { results, responses } });
        } catch (err) {
            setError(err.message);
            setSubmitting(false);
        }
    };

    const currentCategoryName = questionnaire?.categories?.find(c => c.id === currentQuestion?.category)?.name || currentQuestion?.category;

    // Renderitzat condicional
    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center px-4 py-8">
                <div className="w-full max-w-lg rounded-3xl border border-indigo-100 bg-white/90 p-8 text-center shadow-lg">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 font-medium">Carregant questionari...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center px-4 py-8">
                <div className="w-full max-w-xl rounded-3xl border border-red-100 bg-red-50/70 p-6 text-center shadow-sm">
                    <p className="text-red-700 font-bold">Error</p>
                    <p className="text-red-600 mt-2">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-5 inline-flex items-center justify-center rounded-xl bg-red-600 px-5 py-2.5 text-white font-semibold hover:bg-red-700 transition-colors"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    if (submitting) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center px-4 py-8">
                <div className="w-full max-w-lg rounded-3xl border border-indigo-100 bg-white/90 p-8 text-center shadow-lg">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 font-medium">Calculant els teus matches...</p>
                </div>
            </div>
        );
    }

    // Vista principal: pregunta actual
    return (
        <div className="max-w-4xl mx-auto px-4 py-8 sm:py-10">
            <div className="mb-5 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Test de compatibilitat</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900">Troba el millor match per tu</h1>
                <p className="mt-2 text-sm text-gray-600">Respon el qüestionari i et mostrarem els animals més compatibles.</p>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-6 sm:p-8">
                {/* Progress bar */}
                <div className="mb-6">
                    <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-600 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-sm text-gray-500 mt-2 text-right">
                        Pregunta {currentIndex + 1} de {totalQuestions}
                    </p>
                </div>

                {/* Categoria */}
                {currentQuestion?.category && (
                    <div className="mb-4">
                        <span className="inline-flex px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wide rounded-full">
                            {currentCategoryName}
                        </span>
                    </div>
                )}

                {/* Pregunta */}
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {currentQuestion?.text}
                </h2>

                {currentQuestion?.description && (
                    <p className="text-gray-500 mb-6">{currentQuestion.description}</p>
                )}

                {/* Tipus de pregunta */}
                {currentQuestion?.type === 'multiple_choice' && (
                    <p className="text-sm text-indigo-600 mb-4 font-medium">
                        Pots seleccionar varies opcions
                    </p>
                )}

                {/* Opcions */}
                <div className="space-y-3 mb-8">
                    {currentQuestion?.options?.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => handleOptionSelect(option.value)}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                                isOptionSelected(option.value)
                                    ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                                    : 'border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/40'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className={`font-medium ${
                                    isOptionSelected(option.value) ? 'text-indigo-700' : 'text-gray-700'
                                }`}>
                                    {option.label}
                                </span>
                                {isOptionSelected(option.value) && (
                                    <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Navegacio */}
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                    <button
                        onClick={handlePrevious}
                        disabled={currentIndex === 0}
                        className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Anterior
                    </button>

                    <button
                        onClick={handleNext}
                        disabled={!canProceed()}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {currentIndex < totalQuestions - 1 ? 'Seguent' : 'Veure Resultats'}
                    </button>
                </div>
            </div>
        </div>
    );
}
