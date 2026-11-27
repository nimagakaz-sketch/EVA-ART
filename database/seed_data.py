import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database.models import PriceConfig, Pattern, FAQ

logger = logging.getLogger(__name__)

DEFAULT_PRICES = [
    {
        "key": "package_standard",
        "title": "Стандартный салон (водитель + пассажир + задний ряд + перемычка)",
        "category": "package",
        "price": 2800,
        "description": "Комплект в салон с штатным крепежом и липучками",
    },
    {
        "key": "addon_3d_borders",
        "title": "3D формовка с высокими бортами",
        "category": "addon",
        "price": 1200,
        "description": "Цельная лапа без разреза, высокие борта закрывают ворс по бокам",
    },
    {
        "key": "addon_trunk",
        "title": "Коврик в багажник",
        "category": "addon",
        "price": 2000,
        "description": "Точная геометрия багажника с ячеистой структурой",
    },
    {
        "key": "heel_pad_metal",
        "title": "Металлический подпятник (сталь + резиновые вставки)",
        "category": "heel_pad",
        "price": 700,
        "description": "Надёжная защита зоны под пяткой с противоскользящими ребрами",
    },
    {
        "key": "heel_pad_polymer",
        "title": "Полимерный EVA-подпятник в цвет коврика",
        "category": "heel_pad",
        "price": 400,
        "description": "Усиленный полимерный подпятник под правую ногу",
    },
    {
        "key": "badge_pair_2",
        "title": "Металлические шильдики с логотипом марки авто (2 шт.)",
        "category": "badge",
        "price": 500,
        "description": "Шильдики на передние коврики с заводским логотипом вашей марки",
    },
    {
        "key": "badge_pair_4",
        "title": "Металлические шильдики с логотипом марки авто (4 шт.)",
        "category": "badge",
        "price": 900,
        "description": "Шильдики на все коврики (передние + задние)",
    },
]

DEFAULT_PATTERNS = [
    # Toyota
    {"car_make": "Toyota", "car_model": "Camry", "year_from": 2006, "year_to": 2024, "has_3d": True, "notes": "XV40, XV50, XV55, XV70"},
    {"car_make": "Toyota", "car_model": "RAV4", "year_from": 2005, "year_to": 2024, "has_3d": True, "notes": "XA30, XA40, XA50"},
    {"car_make": "Toyota", "car_model": "Corolla", "year_from": 2006, "year_to": 2024, "has_3d": True, "notes": "E150, E160, E180, E210"},
    {"car_make": "Toyota", "car_model": "Land Cruiser 200", "year_from": 2007, "year_to": 2021, "has_3d": True, "notes": "5 мест / 7 мест"},
    {"car_make": "Toyota", "car_model": "Land Cruiser 300", "year_from": 2021, "year_to": 2025, "has_3d": True, "notes": "Полный комплект"},
    {"car_make": "Toyota", "car_model": "Land Cruiser Prado", "year_from": 2002, "year_to": 2024, "has_3d": True, "notes": "J120, J150"},
    {"car_make": "Toyota", "car_model": "Highlander", "year_from": 2007, "year_to": 2023, "has_3d": True, "notes": "U40, U50"},
    {"car_make": "Toyota", "car_model": "Avensis", "year_from": 2003, "year_to": 2018, "has_3d": True, "notes": "T250, T270"},
    # Hyundai
    {"car_make": "Hyundai", "car_model": "Solaris", "year_from": 2010, "year_to": 2024, "has_3d": True, "notes": "1 и 2 поколение"},
    {"car_make": "Hyundai", "car_model": "Creta", "year_from": 2016, "year_to": 2024, "has_3d": True, "notes": "1 и 2 поколение"},
    {"car_make": "Hyundai", "car_model": "Tucson", "year_from": 2004, "year_to": 2024, "has_3d": True, "notes": "JM, LM, TL, NX4"},
    {"car_make": "Hyundai", "car_model": "Santa Fe", "year_from": 2006, "year_to": 2024, "has_3d": True, "notes": "CM, DM, TM"},
    {"car_make": "Hyundai", "car_model": "Elantra", "year_from": 2006, "year_to": 2024, "has_3d": True, "notes": "HD, MD, AD, CN7"},
    {"car_make": "Hyundai", "car_model": "Sonata", "year_from": 2005, "year_to": 2024, "has_3d": True, "notes": "NF, YF, LF, DN8"},
    # Kia
    {"car_make": "Kia", "car_model": "Rio", "year_from": 2005, "year_to": 2024, "has_3d": True, "notes": "JB, QB, FB, X-Line"},
    {"car_make": "Kia", "car_model": "Sportage", "year_from": 2004, "year_to": 2024, "has_3d": True, "notes": "KM, SL, QL, NQ5"},
    {"car_make": "Kia", "car_model": "Ceed", "year_from": 2006, "year_to": 2024, "has_3d": True, "notes": "ED, JD, CD"},
    {"car_make": "Kia", "car_model": "K5", "year_from": 2020, "year_to": 2024, "has_3d": True, "notes": "DL3"},
    {"car_make": "Kia", "car_model": "Optima", "year_from": 2010, "year_to": 2020, "has_3d": True, "notes": "TF, JF"},
    {"car_make": "Kia", "car_model": "Sorento", "year_from": 2002, "year_to": 2024, "has_3d": True, "notes": "XM, UM, MQ4"},
    {"car_make": "Kia", "car_model": "Cerato", "year_from": 2008, "year_to": 2024, "has_3d": True, "notes": "TD, YD, BD"},
    # Lada
    {"car_make": "Lada", "car_model": "Vesta", "year_from": 2015, "year_to": 2025, "has_3d": True, "notes": "Седан, SW, Cross, NG"},
    {"car_make": "Lada", "car_model": "Granta", "year_from": 2011, "year_to": 2025, "has_3d": True, "notes": "FL, Седан, Лифтбек"},
    {"car_make": "Lada", "car_model": "Largus", "year_from": 2012, "year_to": 2024, "has_3d": True, "notes": "5 мест / 7 мест"},
    {"car_make": "Lada", "car_model": "Niva Travel / Chevrolet Niva", "year_from": 2002, "year_to": 2025, "has_3d": True, "notes": "Шеви Нива и Трэвел"},
    {"car_make": "Lada", "car_model": "Niva Legend (4x4)", "year_from": 1977, "year_to": 2025, "has_3d": True, "notes": "3-дверная / 5-дверная"},
    # Haval
    {"car_make": "Haval", "car_model": "Jolion", "year_from": 2020, "year_to": 2025, "has_3d": True, "notes": "2WD / 4WD (разные коврики)"},
    {"car_make": "Haval", "car_model": "F7 / F7x", "year_from": 2019, "year_to": 2025, "has_3d": True, "notes": "1 и 2 поколение"},
    {"car_make": "Haval", "car_model": "Dargo", "year_from": 2021, "year_to": 2025, "has_3d": True, "notes": "Идеальная посадка"},
    {"car_make": "Haval", "car_model": "M6", "year_from": 2023, "year_to": 2025, "has_3d": True, "notes": "Новинка"},
    # Geely
    {"car_make": "Geely", "car_model": "Monjaro", "year_from": 2021, "year_to": 2025, "has_3d": True, "notes": "Премиум 3D лекала"},
    {"car_make": "Geely", "car_model": "Coolray", "year_from": 2019, "year_to": 2025, "has_3d": True, "notes": "Дорест и Рестайлинг"},
    {"car_make": "Geely", "car_model": "Atlas / Atlas Pro", "year_from": 2017, "year_to": 2025, "has_3d": True, "notes": "Все модификации"},
    # Chery
    {"car_make": "Chery", "car_model": "Tiggo 7 Pro / Max", "year_from": 2020, "year_to": 2025, "has_3d": True, "notes": "С бортами"},
    {"car_make": "Chery", "car_model": "Tiggo 4 / Pro", "year_from": 2019, "year_to": 2025, "has_3d": True, "notes": "Все комплектации"},
    {"car_make": "Chery", "car_model": "Tiggo 8 Pro / Max", "year_from": 2020, "year_to": 2025, "has_3d": True, "notes": "Салон и багажник"},
    # Volkswagen & Skoda
    {"car_make": "Volkswagen", "car_model": "Polo", "year_from": 2009, "year_to": 2024, "has_3d": True, "notes": "Седан и Лифтбек"},
    {"car_make": "Volkswagen", "car_model": "Tiguan", "year_from": 2007, "year_to": 2024, "has_3d": True, "notes": "1 и 2 поколение"},
    {"car_make": "Volkswagen", "car_model": "Passat", "year_from": 2005, "year_to": 2024, "has_3d": True, "notes": "B6, B7, B8"},
    {"car_make": "Skoda", "car_model": "Octavia", "year_from": 2004, "year_to": 2024, "has_3d": True, "notes": "A5, A7, A8"},
    {"car_make": "Skoda", "car_model": "Rapid", "year_from": 2012, "year_to": 2024, "has_3d": True, "notes": "1 и 2 поколение"},
    {"car_make": "Skoda", "car_model": "Kodiaq", "year_from": 2016, "year_to": 2024, "has_3d": True, "notes": "5 и 7 мест"},
    # Nissan & Renault
    {"car_make": "Nissan", "car_model": "X-Trail", "year_from": 2001, "year_to": 2024, "has_3d": True, "notes": "T30, T31, T32, T33"},
    {"car_make": "Nissan", "car_model": "Qashqai", "year_from": 2006, "year_to": 2024, "has_3d": True, "notes": "J10, J11"},
    {"car_make": "Renault", "car_model": "Duster", "year_from": 2010, "year_to": 2024, "has_3d": True, "notes": "1 и 2 поколение"},
    {"car_make": "Renault", "car_model": "Logan / Sandero", "year_from": 2004, "year_to": 2024, "has_3d": True, "notes": "1 и 2 поколение, Stepway"},
    # Mazda & Mitsubishi
    {"car_make": "Mazda", "car_model": "CX-5", "year_from": 2011, "year_to": 2024, "has_3d": True, "notes": "KE, KF"},
    {"car_make": "Mazda", "car_model": "6", "year_from": 2002, "year_to": 2024, "has_3d": True, "notes": "GG, GH, GJ"},
    {"car_make": "Mitsubishi", "car_model": "Outlander", "year_from": 2003, "year_to": 2024, "has_3d": True, "notes": "XL, 3 поколение"},
    {"car_make": "Mitsubishi", "car_model": "Pajero Sport", "year_from": 2008, "year_to": 2024, "has_3d": True, "notes": "2 и 3 поколение"},
    # German Premium
    {"car_make": "BMW", "car_model": "5 Series", "year_from": 2003, "year_to": 2024, "has_3d": True, "notes": "E60, F10, G30"},
    {"car_make": "BMW", "car_model": "X5", "year_from": 1999, "year_to": 2024, "has_3d": True, "notes": "E53, E70, F15, G05"},
    {"car_make": "Mercedes-Benz", "car_model": "E-Class", "year_from": 2002, "year_to": 2024, "has_3d": True, "notes": "W211, W212, W213"},
]

DEFAULT_FAQ = [
    {
        "question": "Почему EVA-коврики лучше обычных резиновых или ворсовых?",
        "answer": (
            "1. Чистота обуви и салона: глубокие ячейки (глубина ~8 мм) запирают до 2.5 литров воды, "
            "снежной каши, грязи и песка. Влага не переливается через край и не плещется под ногами при резком торможении.\n"
            "2. Морозостойкость: материал не «дубеет» и не трескается на сибирских морозах до -50°C, "
            "а летом не плавится и не выделяет неприятных токсичных запахов резины.\n"
            "3. Индивидуальный пошив: коврики шьются строго по оригинальным лекалам пола с полным перекрытием ковролина."
        ),
        "category": "advantages",
        "order_num": 1,
    },
    {
        "question": "Как мыть и ухаживать за EVA ковриками?",
        "answer": (
            "Очень просто! Достаньте коврик из авто, переверните ячейками вниз и постучите ладонью с обратной стороны — "
            "вся сухая пыль, песок и мелкие камешки легко вылетают из ячеек.\n"
            "На автомойке коврики моются аппаратом высокого давления (Karcher) под любым углом. "
            "Материал водоотталкивающий — достаточно встряхнуть, и коврик сухой, можно сразу стелить в салон."
        ),
        "category": "care",
        "order_num": 2,
    },
    {
        "question": "В чём разница между ячейками «Ромб» и «Сота»?",
        "answer": (
            "По эксплуатационным свойствам (удержание воды и грязи) ромб и сота идентичны.\n"
            "Разница исключительно в визуальном стиле: классический «Ромб» выглядит более строго и спортивно, "
            "а «Сота» имеет современный футуристичный вид. Выбирайте то, что больше нравится вам!"
        ),
        "category": "materials",
        "order_num": 3,
    },
    {
        "question": "Что такое 3D коврики с высокими бортами?",
        "answer": (
            "В классическом исполнении зона площадки для отдыха левой ноги (лапа) имеет разрез или отдельный язычок. "
            "В 3D-исполнении зона лапы формуется на термопрессе цельным монолитным элементом БЕЗ единого разреза!\n"
            "Также по периметру делаются высокие борта (3-5 см), которые полностью закрывают заводской ковролин "
            "по бокам тоннеля и порогов, защищая его от налипания грязи и соли."
        ),
        "category": "products",
        "order_num": 4,
    },
    {
        "question": "Сколько времени занимает изготовление заказа?",
        "answer": (
            "Срок изготовления в мастерской EVA-ART составляет всего от 2 до 24 часов (в среднем 1 рабочий день) "
            "при наличии готовых лекал. В день готовности мы сразу присылаем вам уведомление в бот!"
        ),
        "category": "terms",
        "order_num": 5,
    },
    {
        "question": "Что делать, если моей модели нет в списке готовых лекал?",
        "answer": (
            "Никаких проблем! Мы производители, поэтому снимем точные индивидуальные лекала прямо по вашему авто. "
            "Замер абсолютно БЕСПЛАТНЫЙ и занимает всего 15–20 минут в нашем теплом боксе №3 (ул. Карболитовская, 12). "
            "Запишитесь на удобный день и время прямо во вкладке «Запись в бокс» нашего Mini App!"
        ),
        "category": "service",
        "order_num": 6,
    },
    {
        "question": "Какая гарантия на изделия мастерской EVA-ART?",
        "answer": (
            "Мы даем официальную гарантию 12 месяцев на целостность материала, окантовки и креплений. "
            "Используем только плотный первичный EVA-полимер плотностью от 55-60 Шор, армированные нити и надежную стропу."
        ),
        "category": "guarantee",
        "order_num": 7,
    },
    {
        "question": "Где вы находитесь в Кемерово и как проехать?",
        "answer": (
            "Наш адрес: г. Кемерово, ул. Карболитовская, д. 12, бокс №3.\n"
            "Ориентир: въезд в арку, далее прямо во двор до бокса №3.\n"
            "Телефон для связи: +7 951 222 9999.\n"
            "На вкладке «Контакты» вы можете открыть точку в Яндекс.Картах или 2ГИС в один клик."
        ),
        "category": "contacts",
        "order_num": 8,
    },
]

async def seed_initial_data(session: AsyncSession):
    # 1. Seed prices
    for item in DEFAULT_PRICES:
        stmt = select(PriceConfig).where(PriceConfig.key == item["key"])
        res = await session.execute(stmt)
        if not res.scalar_one_or_none():
            cfg = PriceConfig(**item)
            session.add(cfg)
    
    # 2. Seed patterns
    for item in DEFAULT_PATTERNS:
        stmt = select(Pattern).where(
            Pattern.car_make == item["car_make"],
            Pattern.car_model == item["car_model"]
        )
        res = await session.execute(stmt)
        if not res.scalar_one_or_none():
            pat = Pattern(**item)
            session.add(pat)

    # 3. Seed FAQ
    for item in DEFAULT_FAQ:
        stmt = select(FAQ).where(FAQ.question == item["question"])
        res = await session.execute(stmt)
        if not res.scalar_one_or_none():
            faq = FAQ(**item)
            session.add(faq)

    await session.commit()
    logger.info("Default seed data successfully populated.")
