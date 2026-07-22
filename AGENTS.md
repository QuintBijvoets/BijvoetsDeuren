# Bijvoets Deuren projectafspraken

## Veiligheid

- Behandel alle invoer en externe gegevens als onbetrouwbaar.
- Voorkom cross-site scripting (XSS): plaats gebruikersinvoer nooit via `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` of dynamische scriptuitvoering in de pagina. Gebruik veilige DOM-methoden zoals `textContent` en attribuut-/URL-validatie. Als HTML-invoer ooit noodzakelijk wordt, gebruik dan een onderhouden sanitizer met een strikte allowlist.
- Gebruik geen `eval`, `new Function`, inline event-handlers of scripts die uit gebruikersinvoer worden opgebouwd.
- Voeg waar de hosting dit ondersteunt een strikte Content Security Policy en passende beveiligingsheaders toe, waaronder `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` en bescherming tegen framing.
- Gebruik in productie uitsluitend HTTPS. Dwing HTTPS en HSTS af op hostingniveau om onderschepping en downgrades te beperken. Plaats nooit geheimen, tokens of wachtwoorden in clientcode of in de repository.
- Controleer nieuwe externe scripts, stylesheets en dependencies op noodzaak en herkomst. Beperk ze zo veel mogelijk; pin versies en gebruik Subresource Integrity wanneer een extern browserbestand onvermijdelijk is.
- Als formulieren of een backend worden toegevoegd: valideer server-side, gebruik CSRF-bescherming waar van toepassing, rate limiting en veilige cookies (`Secure`, `HttpOnly`, passende `SameSite`).
- Controleer bij elke wijziging expliciet op XSS, injectie, onveilige URL's, gemengde HTTP/HTTPS-content, gelekte gegevens en onnodige externe netwerkverzoeken.

## Lokale controle

- Houd een lokale preview beschikbaar via de loopback-interface (`127.0.0.1`), zodat deze niet voor andere apparaten op het netwerk wordt geopend.
- Start voor deze statische site bijvoorbeeld met `python -m http.server 4173 --bind 127.0.0.1` vanuit de repositorymap.
- Controleer vóór oplevering dat de pagina's lokaal laden en dat de werkmap alleen de bedoelde wijzigingen bevat.

## Commit- en pushbeleid

- Maak nooit een Git-commit en push nooit wijzigingen voordat de eigenaar de lokale preview heeft bekeken en in een bericht expliciet akkoord heeft gegeven met de betreffende wijzigingen.
- Stilte, een algemene positieve reactie of toestemming voor een eerdere wijziging geldt niet als akkoord voor nieuwe wijzigingen.
- Laat vóór het vragen om akkoord duidelijk zien wat er is gewijzigd en hoe dit lokaal kan worden bekeken.
- Na expliciet akkoord: commit alleen de goedgekeurde wijzigingen met een duidelijke commitboodschap. Push uitsluitend binnen de afgesproken branch-/publicatieworkflow.
