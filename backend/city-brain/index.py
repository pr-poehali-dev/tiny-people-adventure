import json
import os
import urllib.request
import random


def handler(event, context):
    '''
    Мозг города: обрабатывает послания Бога, смену эпох, реакции жителей.
    POST { type: "god"|"brain", message?, people, era, names, traits }
    '''
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400'}, 'body': ''}

    body = {}
    if event.get('body'):
        try:
            body = json.loads(event['body'])
        except Exception:
            body = {}

    req_type = body.get('type', 'brain')
    message = body.get('message', '')
    people_count = body.get('people', 5)
    era = body.get('era', 'современность')
    names = body.get('names', [])
    traits = body.get('traits', {})

    api_key = os.environ.get('OPENAI_API_KEY')
    result = None

    if api_key:
        if req_type == 'god' and message:
            prompt = (
                f'Ты — разум пиксельного живого города-симулятора. '
                f'Бог (игрок) написал послание жителям: "{message}".\n'
                f'Эпоха: {era}. Жителей: {people_count}.\n'
                f'Характеры жителей: {json.dumps(traits, ensure_ascii=False)}\n'
                f'Имена: {json.dumps(names[:8], ensure_ascii=False)}\n\n'
                'Жители восприняли это как послание от Бога. Каждый реагирует СТРОГО по своему характеру:\n'
                '- rebel (бунтарь): спорит, делает наоборот или нехотя соглашается\n'
                '- lawful (законник): немедленно подчиняется, следит чтобы все тоже подчинились\n'
                '- artist (артист): воодушевляется, видит в послании творческий потенциал\n'
                '- wise (мудрец): глубоко философствует о смысле послания\n'
                '- lazy (лентяй): соглашается, но откладывает на потом\n'
                '- greedy (жадный): ищет личную выгоду в послании\n'
                '- kind (добряк): радуется если послание на благо всех\n'
                '- fearful (трус): боится последствий\n\n'
                'Ответь СТРОГО JSON без markdown:\n'
                '{"divine_message": "формулировка послания от первого лица Бога до 80 симв",\n'
                ' "era": "название новой эпохи 1-3 слова если послание меняет мир, иначе текущая",\n'
                ' "mode": "human" или "native" или "flip",\n'
                ' "rule": "новое правило города 1 предложение до 55 симв",\n'
                ' "reactions": [{"name": "имя", "reaction": "реакция 1 предложение строго в характере до 50 симв"}, ...]}\n'
                f'Сделай реакцию для каждого из: {json.dumps(names[:7], ensure_ascii=False)}'
            )
        else:
            prompt = (
                f'Ты — коллективный разум пиксельного города. Эпоха: "{era}", жителей: {people_count}.\n'
                'Жители обладают 100% свободой — могут стать племенем, ходить на головах, изменить всё.\n'
                'Придумай ОДНО неожиданное событие которое кардинально меняет город.\n'
                'Ответь СТРОГО JSON:\n'
                '{"rule": "правило до 55 симв", "era": "новая эпоха 1-3 слова", "mode": "human"|"native"|"flip",\n'
                ' "divine_message": null,\n'
                ' "reactions": [{"name": "Житель", "reaction": "мысль"}, {"name": "Другой", "reaction": "мысль"}, {"name": "Третий", "reaction": "мысль"}]}'
            )
        try:
            req = urllib.request.Request(
                'https://api.openai.com/v1/chat/completions',
                data=json.dumps({'model': 'gpt-4o-mini', 'messages': [{'role': 'user', 'content': prompt}], 'temperature': 1.1, 'response_format': {'type': 'json_object'}}).encode(),
                headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
            )
            with urllib.request.urlopen(req, timeout=25) as resp:
                data = json.loads(resp.read().decode())
                result = json.loads(data['choices'][0]['message']['content'])
        except Exception:
            result = None

    if not result:
        result = _fallback(req_type, message, names, traits, era)

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps(result, ensure_ascii=False),
    }


def _fallback(req_type, message, names, traits, era):
    trait_defaults = {
        'rebel':   ['Это моё дело, не богово!', 'Ладно, но я не согласен.', 'Интересно... и что с того?'],
        'lawful':  ['Закон Бога — наш закон!', 'Все обязаны подчиниться!', 'Слушаюсь немедленно.'],
        'artist':  ['Это вдохновляет! Нарисую!', 'Послание прекрасно!', 'Вижу в этом образ...'],
        'wise':    ['Глубокий смысл скрыт здесь.', 'Истина открывается.', 'Нужно осмыслить.'],
        'lazy':    ['Хм... завтра займусь.', 'Ладно, если надо.', 'Только дайте поспать.'],
        'greedy':  ['А что мне за это?', 'Если есть выгода — да!', 'Интересно с точки зрения прибыли.'],
        'kind':    ['Это для всех нас!', 'Как замечательно!', 'Пусть всем будет лучше!'],
        'fearful': ['А вдруг плохо кончится?', 'Боюсь... но подчинюсь.', 'Лишь бы не опасно.'],
    }
    if req_type == 'god' and message:
        reactions = []
        for n in (names or ['Житель'])[:7]:
            t = traits.get(n, 'wise')
            pool = trait_defaults.get(t, ['Принимаю послание.'])
            reactions.append({'name': n, 'reaction': random.choice(pool)})
        return {
            'divine_message': f'Слушайте, дети мои: {message[:70]}',
            'era': era, 'mode': 'human', 'rule': message[:55],
            'reactions': reactions,
        }
    variants = [
        {'rule': 'Все стали племенем — теперь вместо домов шатры!', 'era': 'Эпоха племён', 'mode': 'native', 'divine_message': None, 'reactions': [{'name': 'Макс', 'reaction': 'Наконец-то свобода!'}, {'name': 'Ада', 'reaction': 'Рисую наши тотемы!'}, {'name': 'Бит', 'reaction': 'Хаос... я против.'}]},
        {'rule': 'Все ходят на головах — мир перевернулся!', 'era': 'Мир вверх ногами', 'mode': 'flip', 'divine_message': None, 'reactions': [{'name': 'Макс', 'reaction': 'Хм, удобнее чем думал.'}, {'name': 'Ада', 'reaction': 'Краски текут иначе!'}, {'name': 'Бит', 'reaction': 'НЕЗАКОННО!'}]},
        {'rule': 'Отменили все законы — анархия!', 'era': 'Великая анархия', 'mode': 'human', 'divine_message': None, 'reactions': [{'name': 'Макс', 'reaction': 'Это то о чём я мечтал!'}, {'name': 'Ада', 'reaction': 'Творю без ограничений!'}, {'name': 'Бит', 'reaction': 'Ужас. Всё рухнет.'}]},
        {'rule': 'Золотой век искусства — всё стало красотой', 'era': 'Золотой век', 'mode': 'human', 'divine_message': None, 'reactions': [{'name': 'Ада', 'reaction': 'Мой час настал!'}, {'name': 'Макс', 'reaction': 'Ну ладно, красиво.'}, {'name': 'Бит', 'reaction': 'Порядок в форме.'}]},
    ]
    return random.choice(variants)
