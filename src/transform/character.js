// ============================================================
// character.js — Transformación de raw API -> ViewModel
// ============================================================
// Responsabilidad: recibir objeto crudo de la API y devolver
// un objeto plano y predecible para la UI.
//
// Nunca toca la red. Nunca toca el DOM.
// ============================================================

const SIMPSONS_IMAGE_CDN = "https://cdn.thesimpsonsapi.com/500";

function getImageUrl(raw) {
    const directImage = raw.image ?? "";
    const portraitPath = raw.portrait_path ?? "";

    if (typeof directImage === "string" && directImage.trim()) {
        return directImage;
    }

    if (typeof portraitPath === "string" && portraitPath.trim()) {
        return portraitPath.startsWith("http")
            ? portraitPath
            : `${SIMPSONS_IMAGE_CDN}${portraitPath}`;
    }

    return "";
}

// TODO 1: Implementar getOriginName(raw)
//
// El campo origin en el JSON es un OBJETO anidado: { name: "...", url: "..." }
// No un string. Si accedés con raw.origin.name sin validar -> TypeError.
//
// RUTA en el JSON: results[0].origin.name
//
// Usar optional chaining (?.) para acceso seguro:
//   raw.origin?.name  -> si origin es null/undefined, devuelve undefined
//
// Usar nullish coalescing (??) para el default:
//   raw.origin?.name ?? "Unknown"
//
// POR QUÉ ?? Y NO ||:
//   Si origin.name es "" (string vacío), ?? lo respeta, || lo pisa con "Unknown"
//
export function getOriginName(raw) {
    return raw.origin?.name ?? "Unknown";
}

// TODO 2: Implementar getLocationName(raw)
//
// Mismo patrón que getOriginName.
// RUTA en el JSON: results[0].location.name
//
export function getLocationName(raw) {
    return raw.location?.name ?? "place not found";
}

// TODO 3: Implementar getStatusClass(status)
//
// Mapea el status de la API a la clase CSS del dot de color.
// Valores posibles que devuelve la API: "Alive", "Dead", "unknown"
// Clases CSS en styles.css: "alive", "dead", "unknown"
//
// Tip: usar un objeto como mapa y ?? para el fallback
//
function getStatusClass(status) {
    const map = {
        "Alive": "alive",
        "Dead": "dead",
        "unknown": "unknown"
    };
    return map[status] ?? "unknown";
}   


// TODO 4: Implementar toCharacterProfile(rawCharacter)
//
// Función principal de transformación.
//
// Contrato del ViewModel que debe producir:
// {
//   id: number,
//   name: string,
//   image: string,
//   status: string,
//   statusClass: string,
//   species: string,
//   originName: string,
//   locationName: string,
// }
//
// Pasos:
//   1. Destructuring de campos planos:
//      const { id, name, status, species, image } = rawCharacter
//
//   2. Usar ?? para defaults:
//      name: name ?? "Desconocido"
//
//   3. Usar helpers para campos anidados:
//      originName: getOriginName(rawCharacter)
//      locationName: getLocationName(rawCharacter)
//
export function toCharacterProfile(rawCharacter) {
    const { id, name, status, species, occupation, gender, age } = rawCharacter;
    return {
        id: id ?? 0,
        name: name ?? "unknown",
        image: getImageUrl(rawCharacter),
        status: status ?? "unknown",
        statusClass: getStatusClass(status),
        species: species ?? occupation ?? gender ?? "unknown",
        gender: gender ?? "Unknown",
        age: age ?? "Unknown",
    };
 }

// TODO 5: Implementar toCharacterProfileList(rawArray)
//
// Transforma un ARRAY de personajes raw -> array de ViewModels.
// Usa Array.map() aplicando toCharacterProfile a cada ítem.
//
export function toCharacterProfileList(rawArray) {
    return rawArray.map(toCharacterProfile);
 }
