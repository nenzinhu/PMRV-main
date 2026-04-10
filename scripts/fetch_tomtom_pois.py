import json
import requests
import pandas as pd
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOMTOM_KEY = '3g2ZOIEsJUN2VTkHi6dYW8PuV4kiBTUu'
GPS_DATA_PATH = ROOT / "data" / "gps_data_sc.json"
REFS_JSON_PATH = ROOT / "data" / "referencias_grande_florianopolis_150m.json"

CATEGORIES = {
    '7311': 'Posto de Combustivel',
    '7322': 'SAMU/Ambulancia',
    '7324': 'Bombeiro',
    '7323': 'Policia',
    '9113': 'Borracharia/Oficina',
    '9361009': 'Conveniencia',
    '7321': 'Saude/Hospital',
    '7326': 'Farmacia',
    '7315': 'Restaurante',
    '9361': 'Loja'
}

def fetch_category_search(lat, lon, category_id):
    # Busca num raio de 2km em torno do ponto da rodovia
    url = f"https://api.tomtom.com/search/2/categorySearch/{category_id}.json?key={TOMTOM_KEY}&lat={lat}&lon={lon}&radius=2000&limit=10"
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            return response.json().get('results', [])
    except Exception as e:
        print(f"Erro na busca: {e}")
    return []

def main():
    print("Carregando dados...")
    gps_data = json.loads(GPS_DATA_PATH.read_text(encoding="utf-8"))
    refs_payload = json.loads(REFS_JSON_PATH.read_text(encoding="utf-8"))
    
    roads = ["SC-401", "SC-402", "SC-403", "SC-404", "SC-405", "SC-406", "SC-407", "SC-281", "SC-400"]
    all_pois = {} # Usar dict para evitar duplicatas por ID

    for road in roads:
        if road not in gps_data: continue
        print(f"Processando {road}...")
        points = gps_data[road]
        
        # Amostrar pontos a cada ~2km para buscar em volta
        step = max(1, len(points) // (len(points) // 10 if len(points) > 10 else 1)) 
        # Na verdade, vamos pegar pontos estratégicos (inicio, meio, fim e marcos importantes)
        # Para ser eficiente, vamos pegar a cada 2km da rodovia
        search_points = []
        last_km = -999
        for p in points:
            if p['km'] >= last_km + 2.0:
                search_points.append(p)
                last_km = p['km']

        for p in search_points:
            for cat_id, cat_name in CATEGORIES.items():
                print(f"  Buscando {cat_name} perto do KM {p['km']}...")
                results = fetch_category_search(p['lat'], p['lng'], cat_id)
                for res in results:
                    poi_id = res['id']
                    if poi_id not in all_pois:
                        # Achar o marco de 150m mais próximo
                        poi_lat = res['position']['lat']
                        poi_lon = res['position']['lon']
                        nearest_ref = "N/A"
                        min_dist = float('inf')
                        for r in refs_payload['rows']:
                            if r['rodovia'] == road:
                                d = ((poi_lat - r['latitude'])**2 + (poi_lon - r['longitude'])**2)**0.5
                                if d < min_dist:
                                    min_dist = d
                                    nearest_ref = f"{r['rodovia']} km {r['km_label']} ({r['nome_local']})"

                        all_pois[poi_id] = {
                            "Rodovia Proxima": road,
                            "Nome": res['poi']['name'],
                            "Categoria": cat_name,
                            "Endereco": res['address'].get('freeformAddress', 'N/A'),
                            "Latitude": poi_lat,
                            "Longitude": poi_lon,
                            "Referencia 150m": nearest_ref
                        }
                time.sleep(0.1) # Evitar Rate Limit (QPS)

    df_pois = pd.DataFrame(list(all_pois.values()))
    csv_path = ROOT / "referencias-pois-tomtom-150m.csv"
    df_pois.to_csv(csv_path, index=False, encoding='utf-8-sig')
    print(f"Sucesso! {len(all_pois)} POIs salvos em: {csv_path}")

if __name__ == "__main__":
    main()
