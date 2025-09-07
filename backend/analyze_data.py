import pandas as pd
import sqlite3
from sklearn.cluster import KMeans
from app.core.logger import logger

def analyze_sentiments():
    conn = sqlite3.connect("therapist_data.db")
    df = pd.read_sql_query("SELECT emotion, emotion_intensity, timestamp FROM chats", conn)
    conn.close()

    intensity_map = {"low": 1, "medium": 2, "high": 3}
    df["intensity_numeric"] = df["emotion_intensity"].map(intensity_map)

    summary = df.groupby("emotion").agg({
        "emotion": "count",
        "intensity_numeric": ["mean", "std"]
    }).rename(columns={"emotion": "count"})

    X = df[["intensity_numeric"]].values
    kmeans = KMeans(n_clusters=3, random_state=42)
    df["cluster"] = kmeans.fit_predict(X)

    logger.info("Sentiment Analysis Summary:")
    logger.info(summary)
    logger.info("\nCluster Analysis:")
    logger.info(df.groupby("cluster").agg({"emotion": "count", "intensity_numeric": "mean"}))

    return summary, df

if __name__ == "__main__":
    summary, clustered_data = analyze_sentiments()
    summary.to_csv("sentiment_summary.csv")
    clustered_data.to_csv("clustered_data.csv")