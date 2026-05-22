<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ResetPasswordMail extends Mailable
{
    use Queueable, SerializesModels;

    public $token;

    public function __construct($token)
    {
        $this->token = $token;
    }

public function build()
{
    return $this->subject('Réinitialisation du mot de passe')
        ->markdown('email.reset-password')
        ->with([
            'token' => $this->token
        ]);
}
}
