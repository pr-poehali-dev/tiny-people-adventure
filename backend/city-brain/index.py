import json
import os
import urllib.request


def handler(event, context):
    '''
    Мозг города: нейросеть придумывает новое правило/эпоху/образ жизни для человечков.
    Принимает POST { people: int, era: str }, возвращает { rule, era, mode, thoughts[] }.
    '''
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            'body': '',
        }

    body = {}
    if event.get('body'):
        try:
            body = json.loads(event['body'])
        except Exception:
            body = {}

    people = body.get('people', 5)
    era = body.get('era', 'современность')

    api_key = os.environ.get('OPENAI_API_KEY')
    result = None

    if api_key:
        prompt = (
            f'Ты — коллективный разум пиксельного города. Сейчас эпоха: "{era}", жителей: {people}. '
            'Жители обладают 100% свободой и могут поменять ЛЮБЫЕ правила мира: '
            'превратиться в племя индейцев, начать ходить на головах, ввести новую религию и т.д. '
            'Придумай ОДНО неожиданное новое правило/событие, которое меняет город. '
            'Ответь строго JSON: {"rule": "короткое правило до 60 симв", '
            '"era": "название новой эпохи 1-2 слова", '
            '"mode": один из ["human","flip","native"], '
            '"thoughts": [3 коротких реплики жителей до 40 симв]}'
        )
        try:
            req = urllib.request.Request(
                'https://api.openai.com/v1/chat/completions',
                data=json.dumps({
                    'model': 'gpt-4o-mini',
                    'messages': [{'role': 'user', 'content': prompt}],
                    'temperature': 1.1,
                    'response_format': {'type': 'json_object'},
                }).encode(),
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json',
                },
            )
            with urllib.request.urlopen(req, timeout=25) as resp:
                data = json.loads(resp.read().decode())
                content = data['choices'][0]['message']['content']
                result = json.loads(content)
        except Exception as e:
            result = None

    if not result:
        result = _fallback(era)

    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
        },
        'isBase64Encoded': False,
        'body': json.dumps(result, ensure_ascii=False),
    }


def _fallback(era):
    import random
    variants = [
        {
            'rule': 'Все стали племенем индейцев!',
            'era': 'Эпоха племён', 'mode': 'native',
            'thoughts': ['Разожжём костёр!', 'Где мой тотем?', 'Пляшем до утра!'],
        },
        {
            'rule': 'Теперь все ходят на головах!',
            'era': 'Мир вверх ногами', 'mode': 'flip',
            'thoughts': ['Небо внизу!', 'Кровь к голове...', 'Так даже удобнее!'],
        },
        {
            'rule': 'Отменили деньги, всё бесплатно!',
            'era': 'Эра изобилия', 'mode': 'human',
            'thoughts': ['Дайте два!', 'Наконец-то!', 'А работать зачем?'],
        },
        {
            'rule': 'Ночь длится вечно, время танцев',
            'era': 'Вечная ночь', 'mode': 'human',
            'thoughts': ['Зажигаем!', 'Где солнце?', 'Диско навсегда!'],
        },
        {
            'rule': 'Каждый теперь мэр самого себя',
            'era': 'Анархия', 'mode': 'human',
            'thoughts': ['Я главный!', 'Нет, я!', 'Свобода!'],
        },
    ]
    return random.choice(variants)
