<?php

namespace App\Controller\Frontend;

use Pimcore\Model\Document;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class DefaultController extends AbstractController
{
    /**
     * @Route("/", name="homepage")
     */
    public function indexAction(Document $document): Response
    {
        return $this->render('home/index.html.twig',[
            'document' => $document,
        ]);
    }
}
