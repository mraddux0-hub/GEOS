#include <stdio.h>
#include <conio.h>
#include <windows.h>

#define WIDTH 40
#define HEIGHT 20

int x, y;          // Ball position
int paddleX;       // Paddle position
int ballDirX = 1;
int ballDirY = 1;
int gameOver = 0;

void setup() {
    gameOver = 0;
    x = WIDTH / 2;
    y = HEIGHT / 2;
    paddleX = WIDTH / 2 - 3;
}

void draw() {
    system("cls");

    for (int i = 0; i < WIDTH + 2; i++)
        printf("#");
    printf("\n");

    for (int i = 0; i < HEIGHT; i++) {
        for (int j = 0; j < WIDTH; j++) {
            if (j == 0)
                printf("#");

            if (i == y && j == x)
                printf("O");              // Ball
            else if (i == HEIGHT - 1 &&
                     j >= paddleX &&
                     j <= paddleX + 6)
                printf("=");              // Paddle
            else
                printf(" ");

            if (j == WIDTH - 1)
                printf("#");
        }
        printf("\n");
    }

    for (int i = 0; i < WIDTH + 2; i++)
        printf("#");

    printf("\nA: Left | D: Right | X: Exit\n");
}

void input() {
    if (_kbhit()) {
        char ch = _getch();
        if (ch == 'a' || ch == 'A')
            paddleX--;
        else if (ch == 'd' || ch == 'D')
            paddleX++;
        else if (ch == 'x' || ch == 'X')
            gameOver = 1;
    }
}

void logic() {
    x += ballDirX;
    y += ballDirY;

    // Wall collision
    if (x <= 0 || x >= WIDTH - 1)
        ballDirX *= -1;
    if (y <= 0)
        ballDirY *= -1;

    // Paddle collision
    if (y == HEIGHT - 2 &&
        x >= paddleX &&
        x <= paddleX + 6)
        ballDirY *= -1;

    // Ball missed
    if (y >= HEIGHT - 1)
        gameOver = 1;
}

int main() {
    setup();

    while (!gameOver) {
        draw();
        input();
        logic();
        Sleep(50);
    }

    system("cls");
    printf("\nGAME OVER 😢\n");
    return 0;
}
#include <stdio.h>
#include <conio.h>
#include <windows.h>

#define WIDTH 40
#define HEIGHT 20

int x, y;          // Ball position
int paddleX;       // Paddle position
int ballDirX = 1;
int ballDirY = 1;
int gameOver = 0;

void setup() {
    gameOver = 0;
    x = WIDTH / 2;
    y = HEIGHT / 2;
    paddleX = WIDTH / 2 - 3;
}

void draw() {
    system("cls");

    for (int i = 0; i < WIDTH + 2; i++)
        printf("#");
    printf("\n");

    for (int i = 0; i < HEIGHT; i++) {
        for (int j = 0; j < WIDTH; j++) {
            if (j == 0)
                printf("#");

            if (i == y && j == x)
                printf("O");              // Ball
            else if (i == HEIGHT - 1 &&
                     j >= paddleX &&
                     j <= paddleX + 6)
                printf("=");              // Paddle
            else
                printf(" ");

            if (j == WIDTH - 1)
                printf("#");
        }
        printf("\n");
    }

    for (int i = 0; i < WIDTH + 2; i++)
        printf("#");

    printf("\nA: Left | D: Right | X: Exit\n");
}

void input() {
    if (_kbhit()) {
        char ch = _getch();
        if (ch == 'a' || ch == 'A')
            paddleX--;
        else if (ch == 'd' || ch == 'D')
            paddleX++;
        else if (ch == 'x' || ch == 'X')
            gameOver = 1;
    }
}

void logic() {
    x += ballDirX;
    y += ballDirY;

    // Wall collision
    if (x <= 0 || x >= WIDTH - 1)
        ballDirX *= -1;
    if (y <= 0)
        ballDirY *= -1;

    // Paddle collision
    if (y == HEIGHT - 2 &&
        x >= paddleX &&
        x <= paddleX + 6)
        ballDirY *= -1;

    // Ball missed
    if (y >= HEIGHT - 1)
        gameOver = 1;
}

int main() {
    setup();

    while (!gameOver) {
        draw();
        input();
        logic();
        Sleep(50);
    }

    system("cls");
    printf("\nGAME OVER 😢\n");
    return 0;
}
