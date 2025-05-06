<?php

namespace App\Controller;

use App\DataMapper\Product\ProductLinkDataMapper;
use Pimcore\Bundle\AdminBundle\Controller\Admin\LoginController;
use Pimcore\Controller\FrontendController;
use Pimcore\Model\DataObject\Product;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class DefaultController extends FrontendController
{
    /**
     * @Route ("/testing-url", name="testing-url")
     */
    public function test(Request $request)
    {
        $product = Product::getById(19);
        dd((new ProductLinkDataMapper($product))->toArray($request));
    }
    public function defaultAction(Request $request): Response
    {
        return $this->render('default/default.html.twig');
    }

    /**
     * Forwards the request to admin login
     */
    public function loginAction(): Response
    {
        return $this->forward(LoginController::class.'::loginCheckAction');
    }
}
