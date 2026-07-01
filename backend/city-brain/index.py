import json
import os
import urllib.request


def handler(event, context):
    '''
    Мозг города: нейросеть обрабатывает послания Бога и генерирует реакции жителей.
    POST { type: "god"|"brain", message?: str, people: int, era: str, names: list, traits: dict }
    Возвращает { rule, era, mode, reactions: [{name, reaction}], divine_message }
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
                f'Ты — разум пиксельного города-симулятора. Бог написал послание жителям: "{message}".\n'
                f'Эпоха: {era}. Жителей: {people_count}.\n'
                f'Имена и характеры: {json.dumps(traits, ensure_ascii=False)}\n'
                'Жители восприняли это как послание свыше. Каждый реагирует ПО-СВОЕМУ согласно своему характеру.\n'
                'Характеры: бунтарь спорит, законопослушный подчиняется, артист воодушевляется, мудрец философствует.\n'
                'Ответь строго JSON:\n'
                '{"divine_message": "красивая формулировка послания как от бога до 80 симв",\n'
                ' "era": "название новой эпохи если послание её меняет, иначе текущая",\n'
                ' "mode": один из ["human","flip","native"],\n'
                ' "rule": "новое правило города до 60 симв",\n'
                ' "reactions": [{"name": "имя", "reaction": "реакция 1-2 предложения в характере"}, ...]}\n'
                f'Сделай реакции для: {json.dumps(names[:6], ensure_ascii=False)}'
            )
        else:
            prompt = (
                f'Ты — коллективный разум пиксельного города. Сейчас эпоха: "{era}", жителей: {people_count}.\n'
                'Жители обладают 100% свободой — могут превратиться в племя индейцев, начать ходить на головах, '
                'изменить религию, ввести анархию и т.д.\n'
                'Придумай ОДНО неожиданное новое правило/событие которое меняет город.\n'
                'Ответь строго JSON:\n'
                '{"rule": "короткое правило до 60 симв",\n'
                ' "era": "название новой эпохи 1-3 слова",\n'
                ' "mode": один из ["human","flip","native"],\n'
                ' "divine_message": null,\n'
                ' "reactions": [{"name": "случайный", "reaction": "мысль"}, '
                '{"name": "другой", "reaction": "мысль"}, {"name": "третий", "reaction": "мысль"}]}'
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
        except Exception:
            result = None

    if not result:
        result = _fallback(req_type, message, names, era)

    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
        },
        'body': json.dumps(result, ensure_ascii=False),
    }


def _fallback(req_type, message, names, era):
    import random
    god_reactions_by_trait = {
        'rebel': ['Это приказ?! Я не согласен!', 'Бог не указ — я свободен!', 'Посмотрим ещё...'],
        'lawful': ['Да будет так! Подчиняюсь.', 'Воля Создателя — закон.', 'Слушаюсь и повинуюсь!'],
        'artist': ['О, какое вдохновение!', 'Напишу об этом картину!', 'Послание прекрасно!'],
        'wise': ['Глубокий смысл скрыт здесь...', 'Нужно осмыслить это послание.', 'Истина открылась.'],
        'lazy': ['Хм... ладно, завтра сделаю.', 'Если надо — так и быть.', 'Только дайте поспать...'],
    }
    default_reactions = ['Да будет так, как сказал Бог!', 'Чувствую дыхание высших сил.', 'Невероятно! Послание с небес!']

    if req_type == 'god' and message:
        reactions = [{'name': n, 'reaction': random.choice(default_reactions)} for n in (names or ['Житель'])]
        return {
            'divine_message': f'Слушайте, дети мои: {message}',
            'era': era, 'mode': 'human',
            'rule': message[:60],
            'reactions': reactions,
        }
    variants = [
        {'rule': 'Все стали племенем индейцев!', 'era': 'Эпоха племён', 'mode': 'native',
         'divine_message': None,
         'reactions': [{'name': 'Пиксель', 'reaction': 'Разожжём костёр!'}, {'name': 'Бит', 'reaction': 'Где мой тотем?'}, {'name': 'Нео', 'reaction': 'Пляшем до утра!'}]},
        {'rule': 'Теперь все ходят на головах!', 'era': 'Мир вверх ногами', 'mode': 'flip',
         'divine_message': None,
         'reactions': [{'name': 'Ада', 'reaction': 'Небо внизу!'}, {'name': 'Лея', 'reaction': 'Так даже удобнее!'}, {'name': 'Кода', 'reaction': 'Кровь к голове...'}]},
        {'rule': 'Отменили деньги, всё бесплатно!', 'era': 'Эра изобилия', 'mode': 'human',
         'divine_message': None,
         'reactions': [{'name': 'Джем', 'reaction': 'Дайте два!'}, {'name': 'Рей', 'reaction': 'Наконец-то!'}, {'name': 'Мия', 'reaction': 'А работать зачем?'}]},
        {'rule': 'Каждый теперь мэр самого себя', 'era': 'Анархия', 'mode': 'human',
         'divine_message': None,
         'reactions': [{'name': 'Люкс', 'reaction': 'Я главный!'}, {'name': 'Зет', 'reaction': 'Нет, Я главный!'}, {'name': 'Ория', 'reaction': 'Свобода!'}]},
    ]
    return random.choice(variants)
