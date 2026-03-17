# MatchCota – Plataforma intel·ligent de compatibilitat per a adopcions responsables

## 1. Descripció general i Equip
Som un equip format per dos desenvolupadors web (perfil DAW) i un administrador de sistemes (perfil ASIX). Aquesta combinació no és casual: uneix l'experiència d’usuari i la lògica de negoci amb la seguretat i l’escalabilitat del sistema necessari.

MatchCota és una plataforma SaaS (*Software as a Service*) multi-tenant dissenyada específicament per connectar protectores d'animals amb possibles adoptants mitjançant un sistema intel·ligent de compatibilitat. Tot i néixer com a projecte final de cicle, està plantejat amb mentalitat de producte real, orientat a operar amb dades i necessitats reals del món de la protecció animal.

## 2. El problema: La manca d'encaix
En l'actualitat, moltes adopcions fracassen i acaben en devolucions al cap de poc temps. Darrere d'aquests retorns gairebé mai hi ha una manca d'amor o de bones intencions, sinó una manca de compatibilitat real (diferències d'energia, tolerància amb altres animals, espai d'habitatge o temps disponible) entre l'adoptant i l'animal.

Aquestes fallides suposen una experiència altament traumàtica per a l'animal i generen frustració a les protectores. Com que actualment molts refugis gestionen les dades i el procés d'acollida amb eines bàsiques o directament en paper, valoren el risc d'adopció depenent sobretot de la intuïció humana.

**El nostre objectiu absolut no és substituir el sistema actual ni el criteri dels professionals, sinó reforçar-lo i digitalitzar-lo.** Volem oferir a les entitats una base de dades sòlida per complementar la decisió final.

## 3. La Solució central: El motor de compatibilitat
La base del projecte s'allunya del clàssic impuls visual purament estètic en pro d'una decisió conscient i estructurada.

MatchCota no és un simple catàleg d'animals, funciona a través d'un **model de compatibilitat vectorial**. Sense Machine Learning, sense LLM, sense OCR — purament matemàtic. Funciona així:
- Mitjançant un qüestionari de 10 preguntes, es recull la informació rellevant de l'estil de vida de l'adoptant.
- Les respostes es converteixen en un vector numèric de 7 dimensions que corresponen a les mateixes 7 característiques de matching que la protectora defineix per cada animal (nivell d'energia, sociabilitat, necessitat d'atenció, bo amb nens, bo amb gossos, bo amb gats, experiència necessària).
- El sistema calcula matemàticament (similitud del cosinus) la proximitat entre el vector de l'adoptant i el de cada animal.
- Preferències de mida i edat s'apliquen com a filtres previs, no com a dimensions vectorials.
- Com a resultat final, es genera un rànquing ordenat dels animals més compatibles amb l'estil de vida de l'adoptant.

## 4. Arquitectura Multi-Tenant i Rols Aïllats
MatchCota no ha estat pensada per resoldre l'operativa d'un sol refugi. Es construeix com una plataforma SaaS escalable:
- **SaaS Multi-tenant:** Una sola infraestructura cobreix el funcionament de múltiples protectores de cop, abaratint dràsticament els costos. Cada protectora té un subdomini independent (ex: `protectora-barcelona.matchcota.com`) on l'exposició de la dada i la informació queda 100% aïllada només a aquesta entitat.

Aquest programa es divideix clarament de cara a satisfer dos perfils clau:
1. **Públic Adoptant:** Disposa d'una via per posar-se a prova amb el test, veure els valors del rànquing propis i introduir les dades de contacte si es mostra interès actiu.
2. **Sistema d'Administració de Protectores:** Aquest panell modern de comandament (dashboard) conté les eines logístiques perquè els voluntaris publiquin animals, validin registres i observin el filtratge dels "leads" qualificats que de debò resultin òptims segons l'algoritme.  

## 5. Viabilitat tècnica i Sostenibilitat operativa
Darrere del disseny assequible per a l'usuari final existeix una complexa arquitectura sostinguda per un alt component relacional en bases de dades (PostgreSQL), un backend ràpid executat sobre FastAPI i disseny basat en contenidors preparat per créixer dins del núvol immediatament.

MatchCota conté una voluntat fundacional assequible —pensant clarament en reduir les feines de l’entitat fins on pugui ser inicialment gratuït—. A tall del futur i del seu funcionament a gran escala, s'entén que el manteniment dels servidors i servidors base implicaria costos derivats (núvol constant, manteniment per actualitzacions i seguretat). Tot ingressament simbòlic d'explotació obeeix absolutament a finalitats pràctiques d'aguantar operatiu el web pel benestar tecnològic comunitari sense finalitat comercial agressiva. 

El propòsit últim d’aquesta infraestructura és sistematitzar un criteri, agilitzar enormement la logística dels treballadors per donar menys paperassa a l'organització i permetre orientar més temps i energia al fet veritablement important: el benestar íntegre i definitiu de l'animal.
