import os
import sys
from datetime import datetime, timedelta

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from api.realtime.calculations import (
    get_bac,
    drink_to_bac,
    drinks_to_bac,
    ALCOHOL_DENSITY,
)


def test_get_bac_with_height_age_male():
    bac = get_bac(
        drink_ml=100.0,
        drink_strength=0.4,
        body_weight=70.0,
        gender="MALE",
        age=30.0,
        height=180.0,
    )
    # expected from extended Widmark formula using Watson's TBW
    alcohol_grams = 100.0 * 0.4 * ALCOHOL_DENSITY
    tbw = 2.447 - 0.09516 * 30.0 + 0.1074 * 180.0 + 0.3362 * 70.0
    expected = alcohol_grams / (tbw * 10)
    assert pytest.approx(expected, rel=1e-6) == bac


def test_get_bac_without_height_age_female():
    bac = get_bac(
        drink_ml=150.0,
        drink_strength=0.12,
        body_weight=60.0,
        gender="FEMALE",
    )
    alcohol_grams = 150.0 * 0.12 * ALCOHOL_DENSITY
    widmark = 0.55
    expected = (alcohol_grams / (60.0 * 1000 * widmark)) * 100
    assert pytest.approx(expected, rel=1e-6) == bac


def test_get_bac_invalid_inputs():
    with pytest.raises(AssertionError):
        get_bac(-1, 0.4, 70, "MALE")
    with pytest.raises(AssertionError):
        get_bac(100, 0, 70, "MALE")
    with pytest.raises(AssertionError):
        get_bac(100, 0.4, 70, "OTHER")


def test_drink_to_bac_basic():
    time = datetime.now()
    drink = {"time": time, "volume": 50.0, "strength": 0.4}
    user = {"weight": 80.0, "height": 175.0, "age": 28.0, "gender": "MALE"}
    result = drink_to_bac(drink, user)
    assert result["time"] == time
    expected = get_bac(50.0, 0.4, 80.0, "MALE", age=28.0, height=175.0)
    assert pytest.approx(expected, rel=1e-6) == result["bac"]


def test_drinks_to_bac_single_drink():
    time = datetime(2021, 9, 1, 20, 0)
    drinks = [{"time": time, "volume": 100.0, "strength": 0.4}]
    user = {"weight": 70.0, "height": 180.0, "age": 30.0, "gender": "MALE"}
    states = drinks_to_bac(drinks, user, metabolism_rates=0.015)
    assert len(states) == 3
    assert states[0]["bac"] == 0.0
    bac = get_bac(100.0, 0.4, 70.0, "MALE", age=30.0, height=180.0)
    assert pytest.approx(bac, rel=1e-6) == states[1]["bac"]
    sobriety_hours = bac / 0.015
    expected_time = time + timedelta(hours=sobriety_hours)
    assert states[-1]["bac"] == 0.0
    assert pytest.approx(expected_time.timestamp(), rel=1e-6) == states[-1]["time"].timestamp()


def test_drinks_to_bac_multiple_rates_and_invalid_rate():
    time = datetime(2021, 9, 1, 20, 0)
    drinks = [{"time": time, "volume": 100.0, "strength": 0.4}]
    user = {"weight": 70.0, "height": 180.0, "age": 30.0, "gender": "MALE"}
    results = drinks_to_bac(drinks, user, metabolism_rates={"low": 0.015, "high": 0.03})
    assert set(results.keys()) == {"low", "high"}
    assert len(results["low"]) == 3
    assert results["low"][-1]["bac"] == 0.0
    assert results["high"][-1]["bac"] == 0.0
    with pytest.raises(AssertionError):
        drinks_to_bac(drinks, user, metabolism_rates={"bad": 0.0})
