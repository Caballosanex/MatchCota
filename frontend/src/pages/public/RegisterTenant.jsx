import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createTenant } from '../../api/tenants';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

export const tenantSchema = z
  .object({
    name: z.string().min(1, "El nom de l'entitat és obligatori."),
    slug: z
      .string()
      .min(3, "L'identificador ha de tenir mínim 3 lletres.")
      .regex(/^[a-z0-9-]+$/, 'Només lletres minúscules, números i guions (-)'),
    email: z.string().min(1, "Camp obligatori.").email("Format de correu electrònic no vàlid."),
    cif: z.string().optional(),
    phone: z.string().optional(),
    city: z.string().optional(),
    website: z.union([z.literal(""), z.string().url("La URL ha de començar per http:// o https://")]).optional(),
    admin_password: z.string().min(8, 'La contrasenya ha de tenir com a mínim 8 caràcters.'),
    confirm_password: z.string().min(1, 'Confirma la contrasenya.'),
  })
  .superRefine(({ admin_password, confirm_password }, ctx) => {
    if (admin_password !== confirm_password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirm_password'],
        message: 'Les contrasenyes no coincideixen.',
      });
    }
  });

const normalizeTenantSlug = (value) => value.trim().toLowerCase();

export const buildTenantRootUrl = (tenantSlug) => `https://${tenantSlug}.matchcota.tech/`;

export const buildRedirectFallback = (tenantSlug, registrationEmail) => ({
  destinationUrl: buildTenantRootUrl(tenantSlug),
  registrationEmail,
});

export const buildRedirectMessage = ({ destinationUrl, registrationEmail }) => (
  `Redirecting you to your tenant root (${destinationUrl}). ` +
  `From there, you can continue with public setup and sign in later using ${registrationEmail}.`
);

export const buildTenantPayload = (formData) => {
  const { confirm_password, ...payload } = formData;
  return payload;
};

export default function RegisterTenant() {
  const {
    register,
    handleSubmit,
    reset,
    trigger,
    watch,
    formState: { errors, isSubmitting, touchedFields, submitCount },
  } = useForm({
    resolver: zodResolver(tenantSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      slug: '',
      email: '',
      cif: '',
      phone: '',
      city: '',
      website: '',
      admin_password: '',
      confirm_password: '',
    },
  });

  const [apiError, setApiError] = useState(null);
  const [redirectFallback, setRedirectFallback] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const adminPassword = watch('admin_password');
  const confirmPassword = watch('confirm_password');

  useEffect(() => {
    if (touchedFields.confirm_password) {
      void trigger('confirm_password');
    }
  }, [adminPassword, confirmPassword, touchedFields.confirm_password, trigger]);

  const onSubmit = async (data) => {
    setApiError(null);
    setRedirectFallback(null);

    try {
      const payload = buildTenantPayload(data);
      const createdTenant = await createTenant({
        ...payload,
        slug: normalizeTenantSlug(payload.slug),
      });

      const tenantSlug = normalizeTenantSlug(createdTenant?.slug || data.slug);
      const destinationUrl = buildTenantRootUrl(tenantSlug);
      const registrationEmail = createdTenant?.email || data.email;

      try {
        window.location.assign(destinationUrl);
      } catch {
        setRedirectFallback(buildRedirectFallback(tenantSlug, registrationEmail));
      }

      reset();
    } catch (err) {
      setApiError(err.message || 'Hi ha hagut un error en el registre.');
    }
  };

  const showConfirmError = touchedFields.confirm_password || submitCount > 0;

  const handleRetryRedirect = () => {
    if (!redirectFallback?.destinationUrl) {
      return;
    }

    try {
      window.location.assign(redirectFallback.destinationUrl);
    } catch {
      setApiError('No hem pogut iniciar la redirecció a la pàgina principal del teu shelter. Torna-ho a provar.');
    }
  };

  return (
    <div className="min-h-screen bg-white flex font-sans overflow-hidden">
      <div className="hidden lg:flex lg:w-1/2 bg-[#4A90A4] relative items-center justify-center p-12 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,0 L100,0 L100,100 Z" fill="white" />
          </svg>
        </div>

        <div className="relative z-10 max-w-lg text-white">
          <div className="mb-12">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center group-hover:bg-white/30 transition-all duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <span className="text-3xl font-bold tracking-tight">MatchCota</span>
            </Link>
          </div>

          <h1 className="text-5xl font-extrabold leading-tight mb-8">L'inici d'una nova vida per a cada animal.</h1>

          <ul className="space-y-6">
            {[
              { title: 'Gestió intel·ligent', desc: "Troba l'adoptant ideal amb el nostre sistema de matching." },
              { title: 'Estalvi de temps', desc: "Automatitza processos i centra't en la cura dels animals." },
            ].map((item, i) => (
              <li key={i} className="flex gap-4 items-start">
                <div className="mt-1 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg">{item.title}</h3>
                  <p className="text-white/80 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="absolute -bottom-20 -right-20 opacity-10 transform -rotate-12 pointer-events-none">
          <svg className="w-96 h-96 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 11.5c.6 0 1.2.2 1.7.5.5-2 2-3.5 4.3-3.5 2.5 0 4.5 1.8 4.5 4.5 0 2.2-2.7 5.7-6 9-1.9 2-3.5 2-4.5 2s-2.6 0-4.5-2c-3.3-3.3-6-6.8-6-9 0-2.7 2-4.5 4.5-4.5 2.3 0 3.8 1.5 4.3 3.5.5-.3 1.1-.5 1.7-.5z" />
          </svg>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-gray-50/30">
        <div className="max-w-xl w-full">
          <div className="lg:hidden mb-6 text-center">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="w-10 h-10 bg-[#4A90A4] rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <span className="text-2xl font-bold text-[#4A90A4]">MatchCota</span>
            </Link>
          </div>

          <div className="mb-6 text-center lg:text-left">
            <h2 className="text-3xl lg:text-4xl font-black text-gray-900 mb-2 tracking-tight">Crea el teu compte</h2>
            <p className="text-gray-500 font-medium tracking-tight">Comença avui mateix i dóna vida al teu espai digital.</p>
          </div>

          <form className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="md:col-span-2">
              <label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-1 block ml-1">Nom de l'entitat *</label>
              <input
                {...register('name')}
                placeholder="Protectora d'Animals..."
                className={`w-full bg-white border-2 rounded-2xl px-5 py-3 focus:outline-none transition-all duration-300 shadow-sm ${
                  errors.name ? 'border-red-400 focus:border-red-500 bg-red-50' : 'border-gray-100 focus:border-[#4A90A4] hover:border-gray-200'
                }`}
              />
              {errors.name && <span className="text-red-500 text-xs font-bold block mt-2 ml-1 animate-shake">*{errors.name.message}</span>}
            </div>

            <div className="md:col-span-2">
              <label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-1 block ml-1">Identificador Web *</label>
              <div className="relative group">
                <input
                  {...register('slug')}
                  placeholder="la-teva-entitat"
                  className={`w-full bg-white border-2 rounded-2xl px-5 py-3 pr-32 focus:outline-none transition-all duration-300 shadow-sm ${
                    errors.slug ? 'border-red-400 focus:border-red-500 bg-red-50' : 'border-gray-100 focus:border-[#4A90A4] hover:border-gray-200'
                  }`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-5 pointer-events-none text-gray-300 font-bold group-focus-within:text-[#4A90A4]">
                  .matchcota.tech
                </div>
              </div>
              {errors.slug && <span className="text-red-500 text-xs font-bold block mt-2 ml-1 animate-shake">*{errors.slug.message}</span>}
            </div>

            <div className="md:col-span-2">
              <label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-1 block ml-1">Email professional *</label>
              <input
                {...register('email')}
                placeholder="exemple@entitat.cat"
                className={`w-full bg-white border-2 rounded-2xl px-5 py-3 focus:outline-none transition-all duration-300 shadow-sm ${
                  errors.email ? 'border-red-400 focus:border-red-500 bg-red-50' : 'border-gray-100 focus:border-[#4A90A4] hover:border-gray-200'
                }`}
              />
              {errors.email && <span className="text-red-500 text-xs font-bold block mt-2 ml-1 animate-shake">*{errors.email.message}</span>}
            </div>

            <div>
              <label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-1 block ml-1">CIF</label>
              <input
                {...register('cif')}
                placeholder="G-12345678"
                className={`w-full bg-white border-2 rounded-2xl px-5 py-3 focus:outline-none transition-all duration-300 shadow-sm ${
                  errors.cif ? 'border-red-400 focus:border-red-500 bg-red-50' : 'border-gray-100 focus:border-[#4A90A4] hover:border-gray-200'
                }`}
              />
              {errors.cif && <span className="text-red-500 text-xs font-bold block mt-2 ml-1">*{errors.cif.message}</span>}
            </div>

            <div>
              <label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-1 block ml-1">Telèfon</label>
              <input
                {...register('phone')}
                placeholder="+34..."
                className={`w-full bg-white border-2 rounded-2xl px-5 py-3 focus:outline-none transition-all duration-300 shadow-sm ${
                  errors.phone ? 'border-red-400 focus:border-red-500 bg-red-50' : 'border-gray-100 focus:border-[#4A90A4] hover:border-gray-200'
                }`}
              />
              {errors.phone && <span className="text-red-500 text-xs font-bold block mt-2 ml-1">*{errors.phone.message}</span>}
            </div>

            <div>
              <label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-1 block ml-1">Ciutat</label>
              <input
                {...register('city')}
                placeholder="Barcelona"
                className={`w-full bg-white border-2 rounded-2xl px-5 py-3 focus:outline-none transition-all duration-300 shadow-sm ${
                  errors.city ? 'border-red-400 focus:border-red-500 bg-red-50' : 'border-gray-100 focus:border-[#4A90A4] hover:border-gray-200'
                }`}
              />
              {errors.city && <span className="text-red-500 text-xs font-bold block mt-2 ml-1">*{errors.city.message}</span>}
            </div>

            <div>
              <label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-1 block ml-1">Lloc Web (Només URLs)</label>
              <input
                {...register('website')}
                placeholder="https://..."
                className={`w-full bg-white border-2 rounded-2xl px-5 py-3 focus:outline-none transition-all duration-300 shadow-sm ${
                  errors.website ? 'border-red-400 focus:border-red-500 bg-red-50' : 'border-gray-100 focus:border-[#4A90A4] hover:border-gray-200'
                }`}
              />
              {errors.website && <span className="text-red-500 text-xs font-bold block mt-2 ml-1 animate-shake">*{errors.website.message}</span>}
            </div>

            <div className="md:col-span-2">
              <label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-1 block ml-1">Contrasenya d'administrador *</label>
              <div className="relative">
                <input
                  {...register('admin_password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={`w-full bg-white border-2 rounded-2xl px-5 py-3 pr-24 focus:outline-none transition-all duration-300 shadow-sm ${
                    errors.admin_password ? 'border-red-400 focus:border-red-500 bg-red-50' : 'border-gray-100 focus:border-[#4A90A4] hover:border-gray-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute inset-y-0 right-0 px-5 text-xs font-bold text-[#4A90A4] hover:text-[#3a7c8d]"
                  aria-label={showPassword ? 'Amaga la contrasenya' : 'Mostra la contrasenya'}
                >
                  {showPassword ? 'Amaga' : 'Mostra'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 ml-1">Mínim 8 caràcters.</p>
              {errors.admin_password && (
                <span className="text-red-500 text-xs font-bold block mt-2 ml-1 animate-shake">*{errors.admin_password.message}</span>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-1 block ml-1">Confirma la contrasenya *</label>
              <div className="relative">
                <input
                  {...register('confirm_password')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={`w-full bg-white border-2 rounded-2xl px-5 py-3 pr-24 focus:outline-none transition-all duration-300 shadow-sm ${
                    errors.confirm_password ? 'border-red-400 focus:border-red-500 bg-red-50' : 'border-gray-100 focus:border-[#4A90A4] hover:border-gray-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="absolute inset-y-0 right-0 px-5 text-xs font-bold text-[#4A90A4] hover:text-[#3a7c8d]"
                  aria-label={showConfirmPassword ? 'Amaga la confirmació de contrasenya' : 'Mostra la confirmació de contrasenya'}
                >
                  {showConfirmPassword ? 'Amaga' : 'Mostra'}
                </button>
              </div>
              {showConfirmError && errors.confirm_password && (
                <span className="text-red-500 text-xs font-bold block mt-2 ml-1 animate-shake">*{errors.confirm_password.message}</span>
              )}
            </div>

            <div className="md:col-span-2 mt-4 space-y-4">
              {apiError && (
                <div className="text-red-500 text-sm font-bold bg-red-50 p-4 rounded-xl border border-red-100 animate-shake flex gap-3 items-center">
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {apiError}
                </div>
              )}

              {redirectFallback && (
                <div className="text-[#4A90A4] text-sm font-bold bg-[#4A90A4]/10 p-4 rounded-xl border border-[#4A90A4]/20 space-y-3">
                  <p className="text-base">Shelter created successfully</p>
                  <p>
                    {buildRedirectMessage(redirectFallback)}
                  </p>
                  <p className="break-all text-xs text-gray-700 font-semibold">{redirectFallback.destinationUrl}</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleRetryRedirect}
                      className="bg-[#4A90A4] text-white text-xs uppercase tracking-wider px-4 py-2 rounded-lg hover:bg-[#3a7c8d] transition-colors"
                    >
                      Retry redirect
                    </button>
                    <a
                      href={redirectFallback.destinationUrl}
                      className="text-xs uppercase tracking-wider underline"
                    >
                      Open shelter root
                    </a>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#4A90A4] text-white font-black text-lg py-4 rounded-2xl shadow-xl shadow-[#4A90A4]/20 hover:bg-[#3a7c8d] hover:-translate-y-1 active:translate-y-0 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
              >
                {isSubmitting ? 'Enviant dades...' : 'Create Shelter Account'}
                {!isSubmitting && (
                  <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
