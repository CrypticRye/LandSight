from .preprocess import preprocess_image
import random

def predict_image(img_path):
    """
    Dummy prediction for now.
    """
    # Pretend we processed the image
    preprocess_image(img_path)

    # Return a fake result
    classes = ['forest', 'agriculture', 'urban', 'water']
    return {'class': random.choice(classes), 'confidence': round(random.random(), 2)}