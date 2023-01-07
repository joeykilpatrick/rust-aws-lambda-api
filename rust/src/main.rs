#[macro_use] extern crate rocket;

use lambda_web::{is_running_on_lambda, launch_rocket_on_lambda, LambdaError};

#[get("/")]
fn index() -> &'static str {
    "Hello, world!"
}

#[rocket::main]
async fn main() -> Result<(), LambdaError> {

    let rocket = rocket::build().mount("/", routes![
        index,
    ]);

    if is_running_on_lambda() {
        // Launch on AWS Lambda
        launch_rocket_on_lambda(rocket).await?;
    } else {
        // Launch local server
        let _ = rocket.launch().await?;
    }

    Ok(())
}
