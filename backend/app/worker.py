from app.config import get_settings


def main() -> None:
    settings = get_settings()
    print(f"Worker placeholder started for {settings.app_env}.")
    print("Production queue processing will consume Redis jobs and run LangGraph workflows.")


if __name__ == "__main__":
    main()

