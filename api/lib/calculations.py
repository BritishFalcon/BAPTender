from datetime import datetime

ALCOHOL_DENSITY = 0.789  # g/mL


def get_total_body_water(gender: str, age: float, height: float, weight: float) -> float:
    """
    Calculate Total Body Water (TBW) in liters using Watson's formula.
    :param gender: "MALE" or "FEMALE"
    :param age: Age in years.
    :param height: Height in cm.
    :param weight: Body weight in kg.
    :return: TBW in liters.
    """

    assert 10.0 < age <= 150.0, "Age must be greater than 0 and less than or equal to 150!"
    assert 10.0 < height <= 250.0, "Height must be greater than 0 and less than or equal to 250!"
    assert 50.0 < weight <= 635.0, "Weight must be greater than 0 and less than or equal to 635!"

    match gender.upper():
        case "MALE":
            return 2.447 - 0.09516 * age + 0.1074 * height + 0.3362 * weight
        case "FEMALE":
            return -2.097 + 0.1069 * height + 0.2466 * weight
        case _:
            raise AssertionError("Gender must be either Male or Female!")


def get_widmark_factor(gender: str) -> float:
    """
    Get Widmark factor for Male or Female.
    :param gender: Male/Female.
    :return: Decimal Widmark factor.
    """

    match gender.upper():
        case "MALE":
            return 0.68
        case "FEMALE":
            return 0.55
        case _:
            raise AssertionError("Gender must be either Male or Female!")


def get_bac(drink_ml: float, drink_strength: float, body_weight: float, gender: str,
            age: float = None, height: float = None) -> float:
    """
    Calculate the instantaneous Blood Alcohol Content (BAC) at peak absorption using an
    extended Widmark formula with Watson's TBW.

    Assumes full alcohol absorption, ignoring time and metabolism. The formula used is:

        BAC = alcohol_grams / (TBW * 10)

    where TBW is computed from Watson's formula and the factor 10 converts liters to deciliters.

    :param drink_ml: Alcohol volume in a drink (in mL).
    :param drink_strength: Alcohol strength as a decimal (e.g. 0.4 for 40%).
    :param body_weight: Body weight in kg.
    :param gender: "MALE" or "FEMALE".
    :param age: Age in years.
    :param height: Height in cm.
    :return: Instantaneous BAC as a percentage (g/dL).
    """

    assert drink_ml >= 0.0, "Drink volume must be >= 0!"
    assert 0.0 < drink_strength <= 1.0, "Drink strength must be between 0 and 1!"
    assert 10.0 <= body_weight <= 635.0, "Body weight must be >10 and <= 635 kg!"
    assert gender.upper() in ["MALE", "FEMALE"], "Gender must be either Male or Female!"

    alcohol_grams = drink_ml * drink_strength * ALCOHOL_DENSITY

    if height and age:
        assert 10.0 <= age <= 150.0, "Age must be >10 and <= 150 years!"
        assert 50.0 <= height <= 250.0, "Height must be >50 and <= 250 cm!"

        tbw = get_total_body_water(gender, age, height, body_weight)
        bac = alcohol_grams / (tbw * 10)
        return max(0.0, bac)
    else:
        body_weight_g = body_weight * 1000
        widmark_factor = get_widmark_factor(gender)
        bac = (alcohol_grams / (body_weight_g * widmark_factor)) * 100
        return max(0.0, bac)


def drink_to_bac(drink: dict, user_data: dict) -> dict:
    """
    Calculate the Blood Alcohol Content (BAC) for a single drink.

    :param drink: Dictionary with keys 'time', 'volume' and 'strength'.
    :param user_data: Dictionary with user data, including 'weight', 'height', 'age', and 'gender'.
    """

    assert isinstance(drink, dict), "Drink must be a dictionary!"
    assert isinstance(user_data, dict), "User data must be a dictionary!"
    assert "time" in drink, "Drink must have a 'time' key!"
    assert "volume" in drink, "Drink must have a 'volume' key!"
    assert "strength" in drink, "Drink must have a 'strength' key!"
    assert "weight" in user_data, "User data must have a 'weight' key!"
    assert "height" in user_data, "User data must have a 'height' key!"
    assert "age" in user_data, "User data must have an 'age' key!"
    assert "gender" in user_data, "User data must have a 'gender' key!"

    bac = get_bac(
        drink_ml=drink["volume"],
        drink_strength=drink["strength"],
        body_weight=user_data["weight"],
        gender=user_data["gender"],
        age=user_data["age"],
        height=user_data["height"])

    res = {
        "time": drink["time"],
        "bac": max(0.0, bac)
    }

    return res


def drinks_to_bac(drinks: list[dict], user_data: dict, metabolism_rates: float | dict[str, float] = 0.015) -> list[dict] | dict[str, list[dict]]:
    """
    Calculate the Blood Alcohol Content (BAC) for each drink in a list of drinks.

       ASSUMES THE DRINKS ARE IN CHRONOLOGICAL ASCENDING ORDER!

    :param drinks: List of drinks, each represented as a dictionary with keys 'time', 'volume' and 'strength'.
    :param user_data: Dictionary with single user data, including 'weight', 'height', 'age', and 'gender'.
    :param metabolism_rates: Metabolism rate in g/(dL * hr). If a dictionary is provided, the function will return a dictionary with BAC results for each metabolism rate.
    :return: List of BAC values for each drink.
    """

    # TODO: Assertions
    assert isinstance(drinks, list), "Drinks must be a list!"
    assert all(isinstance(drink, dict) for drink in drinks), "Each drink must be a dictionary!"
    assert isinstance(user_data, dict), "User data must be a dictionary!"
    assert "weight" in user_data, "User data must have a 'weight' key!"
    assert "height" in user_data, "User data must have a 'height' key!"
    assert "age" in user_data, "User data must have an 'age' key!"
    assert "gender" in user_data, "User data must have a 'gender' key!"

    def accumulate_bac(metabolism_rate):
        states = []
        for drink in drinks:
            if states:
                prev_state = states[-1]
                time_diff = (drink["time"] - prev_state["time"]).total_seconds() / 3600
                bac_decrease = time_diff * metabolism_rate
                bac = max(0.0, prev_state["bac"] - bac_decrease)
                if bac == 0.0:
                    states = []
                states.append({'time': drink["time"], 'bac': bac})
            else:
                states.append({'time': drink["time"], 'bac': 0.0})

            new_bac = states[-1]["bac"] + drink_to_bac(drink, user_data)["bac"]
            states.append({'time': drink["time"], 'bac': new_bac})

        return states

    if isinstance(metabolism_rates, dict):
        return {
            label: accumulate_bac(metabolism_rate)
            for label, metabolism_rate in metabolism_rates.items()
        }

    elif isinstance(metabolism_rates, (int, float)):
        return accumulate_bac(metabolism_rates)

    else:
        raise ValueError("Metabolism rates must be a float or a dictionary of floats!")


if __name__ == "__main__":

    user = {
        "weight": 70.0,
        "height": 180.0,
        "age": 22.0,
        "gender": 'male'}

    drinks = [
        {"time": datetime(2021, 9, 1, 20, 0), "volume": 500.0, "strength": 0.4},
    ]

    results = drinks_to_bac(drinks, user, metabolism_rates=0.015)

    # Plot BAC results, one line for each metabolism rate
    times = [result["time"] for result in results]
    bacs = [result["bac"] for result in results]

    print(times)
    print(bacs)

    user = {
        "weight": 70.0,
        "gender": 'male',
        "age": None,
        "height": None}

    results = drinks_to_bac(drinks, user, metabolism_rates=0.015)

    # Plot BAC results, one line for each metabolism rate
    times = [result["time"] for result in results]
    bacs = [result["bac"] for result in results]

    print(times)
    print(bacs)


