// Importamos las herramientas de React Router DOM.
// - Outlet: Sirve como "hueco" donde se renderizarán los componentes hijos según la ruta actual.
// - Link: En lugar de usar etiquetas <a> (que recargan toda la página), usamos Link para navegar de forma rápida sin recargar.
// - useLocation: Un 'hook' que nos da información sobre la URL (ruta) actual en la que se encuentra el usuario.
import { Outlet, Link, useLocation } from 'react-router-dom';

// Importamos nuestra herramienta personalizada (hook) para obtener los datos de la protectora (tenant) actual.
import { useTenant } from '../hooks/useTenant';

/**
 * COMPONENTE: PublicHeader (Cabecera Pública)
 * ----------------------------------------------------------------------
 * Propósito: Muestra el logo o nombre de la aplicación y la barra de navegación principal.
 * Separar esto en su propio componente hace que sea más fácil de leer, de mantener
 * y de modificar en el futuro sin tocar la estructura principal.
 * 
 * @param {string} tenantName - El nombre de la protectora que mostraremos en la cabecera.
 */
function PublicHeader({ tenantName }) {
    return (
        <header className="bg-white shadow">
            {/* Contenedor que centra el contenido y le da un límite de ancho adecuado */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* 'flex justify-between' coloca el menú principal a la izquierda y el botón de admin a la derecha */}
                <div className="flex justify-between h-16">

                    {/* LADO IZQUIERDO: Logo y enlaces de la página */}
                    <div className="flex">
                        {/* Contenedor del Logo o Nombre de la aplicación */}
                        <div className="flex-shrink-0 flex items-center">
                            <Link to="/home" className="text-2xl font-bold text-blue-600">
                                {/* Usamos un operador ternario: Si existe 'tenantName' lo mostramos, si no mostramos 'MatchCota' por defecto */}
                                {tenantName ? tenantName : 'MatchCota'}
                            </Link>
                        </div>

                        {/* Enlaces de navegación principales (Ocultos en pantallas muy pequeñas usando 'hidden', visibles a partir de tablets con 'sm:flex') */}
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            <Link to="/home" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                                Inici
                            </Link>
                            <Link to="/animals" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                                Animals
                            </Link>
                            <Link to="/test" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                                Test Compatibilitat
                            </Link>
                        </div>
                    </div>

                    {/* LADO DERECHO: Enlace de acceso para la administración */}
                    <div className="flex items-center">
                        <Link to="/login" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                            Accés Admin
                        </Link>
                    </div>

                </div>
            </div>
        </header>
    );
}

/**
 * COMPONENTE: PublicFooter (Pie de Página Público)
 * ----------------------------------------------------------------------
 * Propósito: Muestra la información de derechos de autor (copyright) abajo del todo.
 * 
 * @param {string} tenantName - El nombre de la protectora para mostrarlo en el texto de copyright.
 */
function PublicFooter({ tenantName }) {
    // Calculamos el año actual automáticamente para que nunca quede desactualizado
    const currentYear = new Date().getFullYear();
    // Guardamos qué texto vamos a mostrar
    const displayName = tenantName ? tenantName : 'MatchCota';

    return (
        <footer className="bg-white border-t border-gray-200">
            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <p className="text-center text-sm text-gray-500">
                    &copy; {currentYear} {displayName}. Tots els drets reservats.
                </p>
            </div>
        </footer>
    );
}

/**
 * COMPONENTE PRINCIPAL: PublicLayout (Diseño Principal Estructural)
 * ----------------------------------------------------------------------
 * Propósito: Actúa como la "plantilla" o "esqueleto" de toda la web pública.
 * Aquí decidimos qué partes (Cabecera, Contenido, Pie) se muestran interactuando unas con otras.
 */
export default function PublicLayout() {
    // 1. EXTRAER ESTADO: Obtenemos el inquilino (tenant) de nuestro hook personalizado para saber usando qué protectora estamos.
    const { tenant } = useTenant();

    // 2. EXTRAER RUTA: Usamos 'useLocation' para saber en qué página URL estamos navegando ahora mismo.
    const currentLocation = useLocation();

    // 3. LÓGICA DE CONDICIÓN (Regla de negocio visual):
    // Creamos un arreglo/lista con las rutas que corresponden a las páginas de autenticación.
    // Verificamos si la ruta actual (".pathname") está dentro de esa lista usando el método ".includes()".
    // Esto nos devolverá un "true" o un "false" y lo guardamos en una constante con un nombre muy claro.
    // Hacemos esto porque en la página de Login o Registro NO queremos que salga ni la cabecera ni el pie de página, solo pantalla en blanco.
    const isAuthenticationPage = ['/login', '/register-tenant'].includes(currentLocation.pathname);

    return (
        // Contenedor principal: 'min-h-screen' hace que toda la página abarque como mínimo el 100% de la altura visual (100vh).
        // 'flex-col' nos permite organizar nuestro esqueleto apilando etiquetas de arriba hacia abajo (Cabecera, Centro, Pie).
        <div className="min-h-screen flex flex-col bg-gray-50">

            {/* Si NO (!) es una página de autenticación, entonces mostramos la cabecera */}
            {/* Le pasamos "tenant?.name" (el ? evita errores si tenant es nulo) al componente como "Propiedad" */}
            {!isAuthenticationPage && (
                <PublicHeader tenantName={tenant?.name} />
            )}

            {/* ZONA CENTRAL O PRINCIPAL DE LA PÁGINA */}
            {/* 'flex-grow' estira esta sección del medio hacia abajo obligando al pie de página a quedarse en el final de la pantalla. */}
            <main className={`flex-grow ${isAuthenticationPage ? 'flex flex-col' : ''}`}>
                {/* 
                    Aquí aplicamos estilos diferentes basados en la página donde estamos.
                    - Si es Auth: Cero padding ('p-0') y ocupa todo el ancho/alto en blanco roto.
                    - Si es Normal: Un contenedor centrado, restringido y con buenos márgenes ('max-w-7xl mx-auto py-6...').
                */}
                <div className={isAuthenticationPage ? 'w-full h-full p-0' : 'max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'}>
                    {/* <Outlet /> es crucial. Es un portal de React Router por donde saldrá el contenido en sí de la página. 
                        Es decir, aquí aterrizará el código del Home o del Panel, etc., sin modificar el layout. */}
                    <Outlet />
                </div>
            </main>

            {/* Si NO (!) es una página de autenticación, entonces mostramos el pie de página */}
            {!isAuthenticationPage && (
                <PublicFooter tenantName={tenant?.name} />
            )}

        </div>
    );
}
